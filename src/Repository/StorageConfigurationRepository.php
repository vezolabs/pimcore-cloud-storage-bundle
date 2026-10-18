<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Repository;

use DateTime;
use Doctrine\DBAL\Connection;
use InvalidArgumentException;
use RuntimeException;
use Vezolabs\CloudStorageBundle\Entity\ConfigAuditLog;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Security\CredentialEncryptor;

class StorageConfigurationRepository
{
    public const string TABLE_NAME = 'pimcore_cloud_storage_configs';

    public function __construct(
        private readonly Connection $connection,
        private readonly CredentialEncryptor $encryptor,
        private readonly ConfigAuditLogRepository $auditLogRepository
    ) {
    }

    /**
     * @return StorageConfiguration[]
     */
    public function findAll(): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT * FROM ' . self::TABLE_NAME . ' ORDER BY is_active DESC, name ASC'
        );

        return array_map([$this, 'hydrate'], $rows);
    }

    public function findById(int $id): ?StorageConfiguration
    {
        $row = $this->connection->fetchAssociative(
            'SELECT * FROM ' . self::TABLE_NAME . ' WHERE id = ?',
            [$id]
        );

        return $row ? $this->hydrate($row) : null;
    }

    public function findByName(string $name): ?StorageConfiguration
    {
        $row = $this->connection->fetchAssociative(
            'SELECT * FROM ' . self::TABLE_NAME . ' WHERE name = ?',
            [$name]
        );

        return $row ? $this->hydrate($row) : null;
    }

    public function findActive(): ?StorageConfiguration
    {
        $row = $this->connection->fetchAssociative(
            'SELECT * FROM ' . self::TABLE_NAME . ' WHERE is_active = 1 LIMIT 1'
        );

        return $row ? $this->hydrate($row) : null;
    }

    public function countAll(): int
    {
        return (int)$this->connection->fetchOne('SELECT COUNT(*) FROM ' . self::TABLE_NAME);
    }

    public function save(StorageConfiguration $config, ?string $username = 'system'): void
    {
        $now = new DateTime();
        $config->setUpdatedAt($now);

        // If ephemeral unencrypted credentials provided, encrypt them
        if ($config->getUnencryptedCredentials() !== null && !empty($config->getUnencryptedCredentials())) {
            $encrypted = $this->encryptor->encrypt($config->getUnencryptedCredentials());
            $config->setCredentialsEncrypted($encrypted);
        }

        $data = [
            'name' => $config->getName(),
            'display_name' => $config->getDisplayName(),
            'provider' => $config->getProvider(),
            'is_active' => $config->isActive() ? 1 : 0,
            'bucket_or_container' => $config->getBucketOrContainer(),
            'region_or_project' => $config->getRegionOrProject(),
            'endpoint' => $config->getEndpoint(),
            'path_prefix' => $config->getPathPrefix(),
            'auth_type' => $config->getAuthType(),
            'credentials_encrypted' => $config->getCredentialsEncrypted(),
            'settings' => json_encode($config->getSettings(), JSON_THROW_ON_ERROR),
            'last_tested_at' => $config->getLastTestedAt()?->format('Y-m-d H:i:s'),
            'last_test_status' => $config->getLastTestStatus(),
            'last_test_message' => $config->getLastTestMessage(),
            'updated_at' => $now->format('Y-m-d H:i:s'),
            'updated_by' => $username,
        ];

        $isCreate = $config->getId() === null;

        if ($isCreate) {
            $config->setCreatedAt($now);
            $config->setCreatedBy($username);
            $data['created_at'] = $now->format('Y-m-d H:i:s');
            $data['created_by'] = $username;

            $this->connection->insert(self::TABLE_NAME, $data);
            $config->setId((int)$this->connection->lastInsertId());

            $this->auditLogRepository->log(
                ConfigAuditLog::ACTION_CREATE,
                $config->getName(),
                $config->getId(),
                $config->toArray(false),
                $username ?? 'system',
                'Created cloud storage configuration.'
            );
        } else {
            $this->connection->update(self::TABLE_NAME, $data, ['id' => $config->getId()]);

            $this->auditLogRepository->log(
                ConfigAuditLog::ACTION_UPDATE,
                $config->getName(),
                $config->getId(),
                $config->toArray(false),
                $username ?? 'system',
                'Updated cloud storage configuration.'
            );
        }
    }

    public function setActive(int $id, ?string $username = 'system'): void
    {
        $target = $this->findById($id);
        if ($target === null) {
            throw new InvalidArgumentException("Configuration with ID {$id} not found.");
        }

        // Deactivate all
        $this->connection->executeStatement('UPDATE ' . self::TABLE_NAME . ' SET is_active = 0');
        // Activate target
        $this->connection->executeStatement(
            'UPDATE ' . self::TABLE_NAME . ' SET is_active = 1, updated_at = NOW(), updated_by = ? WHERE id = ?',
            [$username, $id]
        );

        $target->setIsActive(true);

        $this->auditLogRepository->log(
            ConfigAuditLog::ACTION_ACTIVATE,
            $target->getName(),
            $target->getId(),
            $target->toArray(false),
            $username ?? 'system',
            "Activated storage configuration '{$target->getDisplayName()}'."
        );
    }

    public function delete(int $id, ?string $username = 'system'): void
    {
        $config = $this->findById($id);
        if ($config === null) {
            return;
        }

        if ($config->isActive()) {
            throw new RuntimeException("Cannot delete active storage configuration '{$config->getName()}'. Activate another configuration first.");
        }

        $snapshot = $config->toArray(false);
        $this->connection->delete(self::TABLE_NAME, ['id' => $id]);

        $this->auditLogRepository->log(
            ConfigAuditLog::ACTION_DELETE,
            $config->getName(),
            $id,
            $snapshot,
            $username ?? 'system',
            "Deleted configuration '{$config->getName()}'."
        );
    }

    public function hydrate(array $row): StorageConfiguration
    {
        $config = new StorageConfiguration();
        $config->setId((int)$row['id']);
        $config->setName($row['name']);
        $config->setDisplayName($row['display_name'] ?? $row['name']);
        $config->setProvider($row['provider']);
        $config->setIsActive((bool)$row['is_active']);
        $config->setBucketOrContainer($row['bucket_or_container'] ?? '');
        $config->setRegionOrProject($row['region_or_project'] ?? null);
        $config->setEndpoint($row['endpoint'] ?? null);
        $config->setPathPrefix($row['path_prefix'] ?? null);
        $config->setAuthType($row['auth_type'] ?? StorageConfiguration::AUTH_S3_ACCESS_KEYS);
        $config->setCredentialsEncrypted($row['credentials_encrypted'] ?? null);

        $settings = [];
        if (!empty($row['settings'])) {
            $decoded = json_decode((string)$row['settings'], true);
            if (\is_array($decoded)) {
                $settings = $decoded;
            }
        }
        $config->setSettings($settings);

        if (!empty($row['last_tested_at'])) {
            $config->setLastTestedAt(new DateTime((string)$row['last_tested_at']));
        }
        $config->setLastTestStatus($row['last_test_status'] ?? StorageConfiguration::TEST_STATUS_NOT_TESTED);
        $config->setLastTestMessage($row['last_test_message'] ?? null);

        if (!empty($row['created_at'])) {
            $config->setCreatedAt(new DateTime((string)$row['created_at']));
        }
        if (!empty($row['updated_at'])) {
            $config->setUpdatedAt(new DateTime((string)$row['updated_at']));
        }
        $config->setCreatedBy($row['created_by'] ?? null);
        $config->setUpdatedBy($row['updated_by'] ?? null);

        // Try decrypting credentials into ephemeral property for internal use
        if (!empty($row['credentials_encrypted'])) {
            try {
                $decrypted = $this->encryptor->decrypt((string)$row['credentials_encrypted']);
                if (\is_array($decrypted)) {
                    $config->setUnencryptedCredentials($decrypted);
                }
            } catch (\Throwable) {
                // Ignore decrypt error on hydrate; stays null if key changed
            }
        }

        return $config;
    }
}
