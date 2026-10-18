<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Repository;

use DateTime;
use Doctrine\DBAL\Connection;
use Vezolabs\CloudStorageBundle\Entity\MigrationJob;

class MigrationJobRepository
{
    public const string TABLE_NAME = 'pimcore_cloud_storage_migration_jobs';

    public function __construct(private readonly Connection $connection)
    {
    }

    public function findById(int $id): ?MigrationJob
    {
        $row = $this->connection->fetchAssociative(
            'SELECT * FROM ' . self::TABLE_NAME . ' WHERE id = ?',
            [$id]
        );

        return $row ? $this->hydrate($row) : null;
    }

    public function findActiveJob(): ?MigrationJob
    {
        $row = $this->connection->fetchAssociative(
            'SELECT * FROM ' . self::TABLE_NAME . " WHERE status = 'running' ORDER BY id DESC LIMIT 1"
        );

        return $row ? $this->hydrate($row) : null;
    }

    /**
     * @return MigrationJob[]
     */
    public function findAll(int $limit = 20): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT * FROM ' . self::TABLE_NAME . ' ORDER BY id DESC LIMIT ' . (int)$limit
        );

        return array_map([$this, 'hydrate'], $rows);
    }

    public function save(MigrationJob $job): void
    {
        $data = [
            'source_config_id' => $job->getSourceConfigId(),
            'target_config_id' => $job->getTargetConfigId(),
            'source_name' => $job->getSourceName(),
            'target_name' => $job->getTargetName(),
            'status' => $job->getStatus(),
            'total_files' => $job->getTotalFiles(),
            'total_bytes' => $job->getTotalBytes(),
            'processed_files' => $job->getProcessedFiles(),
            'processed_bytes' => $job->getProcessedBytes(),
            'failed_files' => $job->getFailedFiles(),
            'current_file' => $job->getCurrentFile(),
            'error_log' => json_encode($job->getErrorLog(), JSON_THROW_ON_ERROR),
            'is_dry_run' => $job->isDryRun() ? 1 : 0,
            'started_at' => $job->getStartedAt()?->format('Y-m-d H:i:s'),
            'finished_at' => $job->getFinishedAt()?->format('Y-m-d H:i:s'),
            'initiated_by' => $job->getInitiatedBy(),
        ];

        if ($job->getId() === null) {
            $data['created_at'] = $job->getCreatedAt()->format('Y-m-d H:i:s');
            $this->connection->insert(self::TABLE_NAME, $data);
            $job->setId((int)$this->connection->lastInsertId());
        } else {
            $this->connection->update(self::TABLE_NAME, $data, ['id' => $job->getId()]);
        }
    }

    public function hydrate(array $row): MigrationJob
    {
        $job = new MigrationJob();
        $job->setId((int)$row['id']);
        $job->setSourceConfigId($row['source_config_id'] ? (int)$row['source_config_id'] : null);
        $job->setTargetConfigId((int)$row['target_config_id']);
        $job->setSourceName($row['source_name']);
        $job->setTargetName($row['target_name']);
        $job->setStatus($row['status']);
        $job->setTotalFiles((int)$row['total_files']);
        $job->setTotalBytes((int)$row['total_bytes']);
        $job->setProcessedFiles((int)$row['processed_files']);
        $job->setProcessedBytes((int)$row['processed_bytes']);
        $job->setFailedFiles((int)$row['failed_files']);
        $job->setCurrentFile($row['current_file'] ?? null);

        $errors = [];
        if (!empty($row['error_log'])) {
            $decoded = json_decode((string)$row['error_log'], true);
            if (\is_array($decoded)) {
                $errors = $decoded;
            }
        }
        $job->setErrorLog($errors);
        $job->setIsDryRun((bool)$row['is_dry_run']);
        $job->setCreatedAt(new DateTime((string)$row['created_at']));
        if (!empty($row['started_at'])) {
            $job->setStartedAt(new DateTime((string)$row['started_at']));
        }
        if (!empty($row['finished_at'])) {
            $job->setFinishedAt(new DateTime((string)$row['finished_at']));
        }
        $job->setInitiatedBy($row['initiated_by'] ?? null);

        return $job;
    }
}
