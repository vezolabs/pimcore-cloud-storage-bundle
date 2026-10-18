<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Entity;

use DateTime;
use DateTimeInterface;

class MigrationJob
{
    public const string STATUS_PENDING = 'pending';
    public const string STATUS_RUNNING = 'running';
    public const string STATUS_COMPLETED = 'completed';
    public const string STATUS_FAILED = 'failed';
    public const string STATUS_CANCELLED = 'cancelled';

    private ?int $id = null;
    private ?int $sourceConfigId = null;
    private int $targetConfigId = 0;
    private string $sourceName = 'local';
    private string $targetName = '';
    private string $status = self::STATUS_PENDING;
    private int $totalFiles = 0;
    private int $totalBytes = 0;
    private int $processedFiles = 0;
    private int $processedBytes = 0;
    private int $failedFiles = 0;
    private ?string $currentFile = null;
    private array $errorLog = [];
    private bool $isDryRun = false;
    private DateTimeInterface $createdAt;
    private ?DateTimeInterface $startedAt = null;
    private ?DateTimeInterface $finishedAt = null;
    private ?string $initiatedBy = null;

    public function __construct()
    {
        $this->createdAt = new DateTime();
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

    public function getSourceConfigId(): ?int
    {
        return $this->sourceConfigId;
    }

    public function setSourceConfigId(?int $sourceConfigId): self
    {
        $this->sourceConfigId = $sourceConfigId;

        return $this;
    }

    public function getTargetConfigId(): int
    {
        return $this->targetConfigId;
    }

    public function setTargetConfigId(int $targetConfigId): self
    {
        $this->targetConfigId = $targetConfigId;

        return $this;
    }

    public function getSourceName(): string
    {
        return $this->sourceName;
    }

    public function setSourceName(string $sourceName): self
    {
        $this->sourceName = $sourceName;

        return $this;
    }

    public function getTargetName(): string
    {
        return $this->targetName;
    }

    public function setTargetName(string $targetName): self
    {
        $this->targetName = $targetName;

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;

        return $this;
    }

    public function getTotalFiles(): int
    {
        return $this->totalFiles;
    }

    public function setTotalFiles(int $totalFiles): self
    {
        $this->totalFiles = $totalFiles;

        return $this;
    }

    public function getTotalBytes(): int
    {
        return $this->totalBytes;
    }

    public function setTotalBytes(int $totalBytes): self
    {
        $this->totalBytes = $totalBytes;

        return $this;
    }

    public function getProcessedFiles(): int
    {
        return $this->processedFiles;
    }

    public function setProcessedFiles(int $processedFiles): self
    {
        $this->processedFiles = $processedFiles;

        return $this;
    }

    public function getProcessedBytes(): int
    {
        return $this->processedBytes;
    }

    public function setProcessedBytes(int $processedBytes): self
    {
        $this->processedBytes = $processedBytes;

        return $this;
    }

    public function getFailedFiles(): int
    {
        return $this->failedFiles;
    }

    public function setFailedFiles(int $failedFiles): self
    {
        $this->failedFiles = $failedFiles;

        return $this;
    }

    public function getCurrentFile(): ?string
    {
        return $this->currentFile;
    }

    public function setCurrentFile(?string $currentFile): self
    {
        $this->currentFile = $currentFile;

        return $this;
    }

    public function getErrorLog(): array
    {
        return $this->errorLog;
    }

    public function setErrorLog(array $errorLog): self
    {
        $this->errorLog = $errorLog;

        return $this;
    }

    public function addError(string $path, string $message): self
    {
        $this->errorLog[] = [
            'path' => $path,
            'message' => $message,
            'time' => (new DateTime())->format(DateTimeInterface::ATOM),
        ];

        return $this;
    }

    public function isDryRun(): bool
    {
        return $this->isDryRun;
    }

    public function setIsDryRun(bool $isDryRun): self
    {
        $this->isDryRun = $isDryRun;

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

    public function getStartedAt(): ?DateTimeInterface
    {
        return $this->startedAt;
    }

    public function setStartedAt(?DateTimeInterface $startedAt): self
    {
        $this->startedAt = $startedAt;

        return $this;
    }

    public function getFinishedAt(): ?DateTimeInterface
    {
        return $this->finishedAt;
    }

    public function setFinishedAt(?DateTimeInterface $finishedAt): self
    {
        $this->finishedAt = $finishedAt;

        return $this;
    }

    public function getInitiatedBy(): ?string
    {
        return $this->initiatedBy;
    }

    public function setInitiatedBy(?string $initiatedBy): self
    {
        $this->initiatedBy = $initiatedBy;

        return $this;
    }

    public function getProgressPercent(): float
    {
        if ($this->totalFiles <= 0) {
            return $this->status === self::STATUS_COMPLETED ? 100.0 : 0.0;
        }

        return round(min(100.0, ($this->processedFiles / $this->totalFiles) * 100), 1);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'source_config_id' => $this->sourceConfigId,
            'target_config_id' => $this->targetConfigId,
            'source_name' => $this->sourceName,
            'target_name' => $this->targetName,
            'status' => $this->status,
            'total_files' => $this->totalFiles,
            'total_bytes' => $this->totalBytes,
            'processed_files' => $this->processedFiles,
            'processed_bytes' => $this->processedBytes,
            'failed_files' => $this->failedFiles,
            'progress_percent' => $this->getProgressPercent(),
            'current_file' => $this->currentFile,
            'error_log' => $this->errorLog,
            'is_dry_run' => $this->isDryRun,
            'created_at' => $this->createdAt->format(DateTimeInterface::ATOM),
            'started_at' => $this->startedAt?->format(DateTimeInterface::ATOM),
            'finished_at' => $this->finishedAt?->format(DateTimeInterface::ATOM),
            'initiated_by' => $this->initiatedBy,
        ];
    }
}
