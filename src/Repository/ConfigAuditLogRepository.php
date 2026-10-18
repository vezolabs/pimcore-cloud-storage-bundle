<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Repository;

use DateTime;
use Doctrine\DBAL\Connection;
use Vezolabs\CloudStorageBundle\Entity\ConfigAuditLog;

class ConfigAuditLogRepository
{
    public const string TABLE_NAME = 'pimcore_cloud_storage_history';

    public function __construct(private readonly Connection $connection)
    {
    }

    public function log(
        string $action,
        string $configName,
        ?int $configId,
        array $snapshot,
        string $user = 'system',
        ?string $note = null
    ): void {
        $this->connection->insert(self::TABLE_NAME, [
            'config_id' => $configId,
            'config_name' => $configName,
            'action' => $action,
            'changed_by' => $user,
            'snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR),
            'note' => $note,
            'created_at' => (new DateTime())->format('Y-m-d H:i:s'),
        ]);
    }

    /**
     * @return ConfigAuditLog[]
     */
    public function findRecent(int $limit = 50): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT * FROM ' . self::TABLE_NAME . ' ORDER BY created_at DESC LIMIT ' . (int)$limit
        );

        return array_map([$this, 'hydrate'], $rows);
    }

    public function hydrate(array $row): ConfigAuditLog
    {
        $log = new ConfigAuditLog();
        $log->setId((int)$row['id']);
        $log->setConfigId($row['config_id'] ? (int)$row['config_id'] : null);
        $log->setConfigName($row['config_name'] ?? '');
        $log->setAction($row['action']);
        $log->setChangedBy($row['changed_by'] ?? 'system');

        $snapshot = [];
        if (!empty($row['snapshot'])) {
            $decoded = json_decode((string)$row['snapshot'], true);
            if (\is_array($decoded)) {
                $snapshot = $decoded;
            }
        }
        $log->setConfigurationSnapshot($snapshot);
        $log->setNote($row['note'] ?? null);
        $log->setCreatedAt(new DateTime((string)$row['created_at']));

        return $log;
    }
}
