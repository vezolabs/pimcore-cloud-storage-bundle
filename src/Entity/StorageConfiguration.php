<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Entity;

use DateTime;
use DateTimeInterface;
use InvalidArgumentException;

class StorageConfiguration
{
    public const string PROVIDER_S3 = 's3';
    public const string PROVIDER_AZURE = 'azure';
    public const string PROVIDER_GCS = 'gcs';
    public const string PROVIDER_LOCAL = 'local';

    public const string AUTH_S3_ACCESS_KEYS = 'access_keys';
    public const string AUTH_S3_IAM_ROLE = 'iam_role';

    public const string AUTH_AZURE_CONNECTION_STRING = 'connection_string';
    public const string AUTH_AZURE_ACCOUNT_KEY = 'account_key';
    public const string AUTH_AZURE_MANAGED_IDENTITY = 'managed_identity';

    public const string AUTH_GCS_SERVICE_ACCOUNT = 'service_account_json';
    public const string AUTH_GCS_ADC = 'application_default_credentials';

    public const string TEST_STATUS_SUCCESS = 'success';
    public const string TEST_STATUS_FAILED = 'failed';
    public const string TEST_STATUS_WARNING = 'warning';
    public const string TEST_STATUS_NOT_TESTED = 'not_tested';

    private ?int $id = null;
    private string $name = '';
    private string $displayName = '';
    private string $provider = self::PROVIDER_S3;
    private bool $isActive = false;
    private string $bucketOrContainer = '';
    private ?string $regionOrProject = null;
    private ?string $endpoint = null;
    private ?string $pathPrefix = null;
    private string $authType = self::AUTH_S3_ACCESS_KEYS;
    private ?string $credentialsEncrypted = null;
    private array $settings = [];
    private ?DateTimeInterface $lastTestedAt = null;
    private ?string $lastTestStatus = self::TEST_STATUS_NOT_TESTED;
    private ?string $lastTestMessage = null;
    private DateTimeInterface $createdAt;
    private DateTimeInterface $updatedAt;
    private ?string $createdBy = null;
    private ?string $updatedBy = null;

    /**
     * Ephemeral unencrypted credentials (never saved directly to database).
     */
    private ?array $unencryptedCredentials = null;

    public function __construct()
    {
        $this->createdAt = new DateTime();
        $this->updatedAt = new DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setId(?int $id): self
    {
        $this->id = $id;

        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9_-]+/', '-', $name) ?? '', '-'));
        if ($slug === '') {
            throw new InvalidArgumentException('Configuration name must contain valid alphanumeric characters.');
        }
        $this->name = $slug;

        return $this;
    }

    public function getDisplayName(): string
    {
        return $this->displayName !== '' ? $this->displayName : $this->name;
    }

    public function setDisplayName(string $displayName): self
    {
        $this->displayName = trim($displayName);

        return $this;
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function setProvider(string $provider): self
    {
        $valid = [self::PROVIDER_S3, self::PROVIDER_AZURE, self::PROVIDER_GCS, self::PROVIDER_LOCAL];
        if (!\in_array($provider, $valid, true)) {
            throw new InvalidArgumentException("Invalid provider '{$provider}'. Allowed: " . implode(', ', $valid));
        }
        $this->provider = $provider;

        return $this;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;

        return $this;
    }

    public function getBucketOrContainer(): string
    {
        return $this->bucketOrContainer;
    }

    public function setBucketOrContainer(string $bucketOrContainer): self
    {
        $this->bucketOrContainer = trim($bucketOrContainer);

        return $this;
    }

    public function getRegionOrProject(): ?string
    {
        return $this->regionOrProject;
    }

    public function setRegionOrProject(?string $regionOrProject): self
    {
        $this->regionOrProject = $regionOrProject !== null ? trim($regionOrProject) : null;

        return $this;
    }

    public function getEndpoint(): ?string
    {
        return $this->endpoint;
    }

    public function setEndpoint(?string $endpoint): self
    {
        $this->endpoint = $endpoint !== null && trim($endpoint) !== '' ? trim($endpoint) : null;

        return $this;
    }

    public function getPathPrefix(): ?string
    {
        return $this->pathPrefix;
    }

    public function setPathPrefix(?string $pathPrefix): self
    {
        if ($pathPrefix === null || trim($pathPrefix) === '') {
            $this->pathPrefix = null;
        } else {
            $this->pathPrefix = trim(trim($pathPrefix), '/');
        }

        return $this;
    }

    public function getAuthType(): string
    {
        return $this->authType;
    }

    public function setAuthType(string $authType): self
    {
        $this->authType = trim($authType);

        return $this;
    }

    public function getCredentialsEncrypted(): ?string
    {
        return $this->credentialsEncrypted;
    }

    public function setCredentialsEncrypted(?string $credentialsEncrypted): self
    {
        $this->credentialsEncrypted = $credentialsEncrypted;

        return $this;
    }

    public function getSettings(): array
    {
        return $this->settings;
    }

    public function setSettings(array $settings): self
    {
        $this->settings = $settings;

        return $this;
    }

    public function getSetting(string $key, mixed $default = null): mixed
    {
        return $this->settings[$key] ?? $default;
    }

    public function setSetting(string $key, mixed $value): self
    {
        $this->settings[$key] = $value;

        return $this;
    }

    public function getLastTestedAt(): ?DateTimeInterface
    {
        return $this->lastTestedAt;
    }

    public function setLastTestedAt(?DateTimeInterface $lastTestedAt): self
    {
        $this->lastTestedAt = $lastTestedAt;

        return $this;
    }

    public function getLastTestStatus(): ?string
    {
        return $this->lastTestStatus;
    }

    public function setLastTestStatus(?string $lastTestStatus): self
    {
        $this->lastTestStatus = $lastTestStatus;

        return $this;
    }

    public function getLastTestMessage(): ?string
    {
        return $this->lastTestMessage;
    }

    public function setLastTestMessage(?string $lastTestMessage): self
    {
        $this->lastTestMessage = $lastTestMessage;

        return $this;
    }

    public function getCreatedAt(): DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getUpdatedAt(): DateTimeInterface
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(DateTimeInterface $updatedAt): self
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }

    public function getCreatedBy(): ?string
    {
        return $this->createdBy;
    }

    public function setCreatedBy(?string $createdBy): self
    {
        $this->createdBy = $createdBy;

        return $this;
    }

    public function getUpdatedBy(): ?string
    {
        return $this->updatedBy;
    }

    public function setUpdatedBy(?string $updatedBy): self
    {
        $this->updatedBy = $updatedBy;

        return $this;
    }

    public function getUnencryptedCredentials(): ?array
    {
        return $this->unencryptedCredentials;
    }

    public function setUnencryptedCredentials(?array $unencryptedCredentials): self
    {
        $this->unencryptedCredentials = $unencryptedCredentials;

        return $this;
    }

    public function hasCredentialsConfigured(): bool
    {
        return ($this->credentialsEncrypted !== null && $this->credentialsEncrypted !== '')
            || ($this->unencryptedCredentials !== null && !empty($this->unencryptedCredentials));
    }

    /**
     * Serializes to array for API / Studio UI. Never exposes raw credentials!
     */
    public function toArray(bool $includeSecrets = false): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'display_name' => $this->getDisplayName(),
            'provider' => $this->provider,
            'is_active' => $this->isActive,
            'bucket_or_container' => $this->bucketOrContainer,
            'region_or_project' => $this->regionOrProject,
            'endpoint' => $this->endpoint,
            'path_prefix' => $this->pathPrefix,
            'auth_type' => $this->authType,
            'settings' => $this->settings,
            'has_credentials' => $this->hasCredentialsConfigured(),
            'last_tested_at' => $this->lastTestedAt?->format(DateTimeInterface::ATOM),
            'last_test_status' => $this->lastTestStatus ?? self::TEST_STATUS_NOT_TESTED,
            'last_test_message' => $this->lastTestMessage,
            'created_at' => $this->createdAt->format(DateTimeInterface::ATOM),
            'updated_at' => $this->updatedAt->format(DateTimeInterface::ATOM),
            'created_by' => $this->createdBy,
            'updated_by' => $this->updatedBy,
        ];

        if ($includeSecrets && $this->unencryptedCredentials !== null) {
            $data['credentials'] = $this->unencryptedCredentials;
        } else {
            // Masked presentation for security
            $data['credentials_masked'] = $this->getMaskedCredentialsSummary();
        }

        return $data;
    }

    private function getMaskedCredentialsSummary(): array
    {
        $summary = [
            'configured' => $this->hasCredentialsConfigured(),
            'auth_type' => $this->authType,
        ];

        if ($this->provider === self::PROVIDER_S3) {
            $summary['method'] = $this->authType === self::AUTH_S3_IAM_ROLE ? 'IAM Role / Instance Profile' : 'Access Key ID & Secret';
            $accessKey = $this->unencryptedCredentials['access_key_id'] ?? null;
            if ($accessKey) {
                $summary['access_key_preview'] = substr((string)$accessKey, 0, 4) . '••••' . substr((string)$accessKey, -4);
            }
        } elseif ($this->provider === self::PROVIDER_AZURE) {
            $summary['method'] = match ($this->authType) {
                self::AUTH_AZURE_MANAGED_IDENTITY => 'Azure Managed Identity',
                self::AUTH_AZURE_ACCOUNT_KEY => 'Storage Account Key',
                default => 'Connection String',
            };
        } elseif ($this->provider === self::PROVIDER_GCS) {
            $summary['method'] = $this->authType === self::AUTH_GCS_ADC
                ? 'Application Default Credentials (ADC)'
                : 'Service Account Key (JSON)';
        }

        return $summary;
    }
}
