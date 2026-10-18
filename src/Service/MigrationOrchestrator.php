<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Service;

use DateTime;
use League\Flysystem\Config;
use League\Flysystem\StorageAttributes;
use Psr\Log\LoggerInterface;
use Throwable;
use Vezolabs\CloudStorageBundle\Entity\MigrationJob;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Provider\StorageProviderRegistry;
use Vezolabs\CloudStorageBundle\Repository\MigrationJobRepository;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;
use Vezolabs\CloudStorageBundle\Security\SecretSanitizer;

class MigrationOrchestrator
{
    public function __construct(
        private readonly StorageConfigurationRepository $configRepository,
        private readonly MigrationJobRepository $jobRepository,
        private readonly StorageProviderRegistry $providerRegistry,
        private readonly LoggerInterface $logger
    ) {
    }

    /**
     * Performs preflight scan between source and target storages.
     */
    public function preflightScan(StorageConfiguration $source, StorageConfiguration $target): array
    {
        $sourceProvider = $this->providerRegistry->get($source->getProvider());
        $targetProvider = $this->providerRegistry->get($target->getProvider());

        $sourceAdapter = $sourceProvider->createAdapter($source);
        $targetAdapter = $targetProvider->createAdapter($target);

        $totalFiles = 0;
        $totalBytes = 0;
        $sampleFiles = [];

        try {
            $contents = $sourceAdapter->listContents('/', true);
            foreach ($contents as $item) {
                if ($item->isFile()) {
                    $totalFiles++;
                    $size = $item->fileSize() ?? 0;
                    $totalBytes += $size;

                    if (\count($sampleFiles) < 10) {
                        $sampleFiles[] = [
                            'path' => $item->path(),
                            'size' => $size,
                        ];
                    }
                }
            }
        } catch (Throwable $e) {
            $this->logger->error('Migration preflight scan failed on source: ' . $e->getMessage());
            throw $e;
        }

        // Test target accessibility
        $targetAccessible = false;
        try {
            $targetAccessible = true;
            // Quick check if directory listing works on target
            iterator_to_array($targetAdapter->listContents('/', false));
        } catch (Throwable) {
            $targetAccessible = false;
        }

        // Rough bandwidth assumption: 10 MB/s for estimation
        $estimatedSeconds = max(5, (int)ceil($totalBytes / (10 * 1024 * 1024)));

        return [
            'total_files' => $totalFiles,
            'total_bytes' => $totalBytes,
            'formatted_size' => $this->formatBytes($totalBytes),
            'target_accessible' => $targetAccessible,
            'estimated_duration_seconds' => $estimatedSeconds,
            'sample_files' => $sampleFiles,
        ];
    }

    /**
     * Starts and executes migration process.
     */
    public function runMigration(MigrationJob $job, ?callable $progressCallback = null): void
    {
        $sourceConfig = $job->getSourceConfigId()
            ? $this->configRepository->findById($job->getSourceConfigId())
            : $this->getOrCreateLocalFallbackConfig();

        $targetConfig = $this->configRepository->findById($job->getTargetConfigId());

        if ($targetConfig === null) {
            $job->setStatus(MigrationJob::STATUS_FAILED);
            $job->addError('general', 'Target configuration not found.');
            $this->jobRepository->save($job);

            return;
        }

        $job->setStatus(MigrationJob::STATUS_RUNNING);
        $job->setStartedAt(new DateTime());
        $this->jobRepository->save($job);

        try {
            $sourceAdapter = $this->providerRegistry->get($sourceConfig->getProvider())->createAdapter($sourceConfig);
            $targetAdapter = $this->providerRegistry->get($targetConfig->getProvider())->createAdapter($targetConfig);

            $processedFiles = $job->getProcessedFiles();
            $processedBytes = $job->getProcessedBytes();
            $failedFiles = $job->getFailedFiles();
            $batchCounter = 0;

            /** @var StorageAttributes $item */
            foreach ($sourceAdapter->listContents('/', true) as $item) {
                // Check if job was cancelled
                $refreshed = $this->jobRepository->findById($job->getId());
                if ($refreshed?->getStatus() === MigrationJob::STATUS_CANCELLED) {
                    $this->logger->info("Migration job #{$job->getId()} was cancelled by user.");

                    return;
                }

                if (!$item->isFile()) {
                    continue;
                }

                $path = $item->path();
                $size = $item->fileSize() ?? 0;
                $job->setCurrentFile($path);

                try {
                    // Check if already on target with matching size (resumable)
                    if ($targetAdapter->fileExists($path)) {
                        $targetSize = $targetAdapter->fileSize($path)->fileSize();
                        if ($targetSize === $size) {
                            $processedFiles++;
                            $processedBytes += $size;
                            continue;
                        }
                    }

                    if (!$job->isDryRun()) {
                        $sourceStream = $sourceAdapter->readStream($path);
                        $targetAdapter->writeStream($path, $sourceStream, new Config());

                        if (\is_resource($sourceStream)) {
                            fclose($sourceStream);
                        }
                    }

                    $processedFiles++;
                    $processedBytes += $size;
                } catch (Throwable $e) {
                    $failedFiles++;
                    $job->addError($path, SecretSanitizer::sanitizeString($e->getMessage()));
                    $this->logger->warning("Migration failed for {$path}: " . $e->getMessage());
                }

                $batchCounter++;
                if ($batchCounter % 10 === 0) {
                    $job->setProcessedFiles($processedFiles);
                    $job->setProcessedBytes($processedBytes);
                    $job->setFailedFiles($failedFiles);
                    $this->jobRepository->save($job);

                    if ($progressCallback !== null) {
                        $progressCallback($job);
                    }
                }
            }

            $job->setProcessedFiles($processedFiles);
            $job->setProcessedBytes($processedBytes);
            $job->setFailedFiles($failedFiles);
            $job->setCurrentFile(null);
            $job->setStatus($failedFiles > 0 ? MigrationJob::STATUS_COMPLETED : MigrationJob::STATUS_COMPLETED);
            $job->setFinishedAt(new DateTime());
            $this->jobRepository->save($job);
        } catch (Throwable $e) {
            $job->setStatus(MigrationJob::STATUS_FAILED);
            $job->addError('fatal', SecretSanitizer::sanitizeString($e->getMessage()));
            $job->setFinishedAt(new DateTime());
            $this->jobRepository->save($job);
            $this->logger->critical("Migration fatal failure: " . $e->getMessage());
        }
    }

    private function getOrCreateLocalFallbackConfig(): StorageConfiguration
    {
        $config = new StorageConfiguration();
        $config->setName('local');
        $config->setDisplayName('Local Storage (/public/var/assets)');
        $config->setProvider(StorageConfiguration::PROVIDER_LOCAL);

        return $config;
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $power = $bytes > 0 ? floor(log($bytes, 1024)) : 0;

        return number_format($bytes / (1024 ** $power), 2, '.', '') . ' ' . ($units[$power] ?? 'B');
    }
}
