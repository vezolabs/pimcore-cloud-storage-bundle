<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Tests\Unit;

use League\Flysystem\Config;
use League\Flysystem\FileAttributes;
use League\Flysystem\FilesystemAdapter;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Vezolabs\CloudStorageBundle\Entity\MigrationJob;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Provider\StorageProviderInterface;
use Vezolabs\CloudStorageBundle\Provider\StorageProviderRegistry;
use Vezolabs\CloudStorageBundle\Repository\MigrationJobRepository;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;
use Vezolabs\CloudStorageBundle\Service\MigrationOrchestrator;

class MigrationOrchestratorTest extends TestCase
{
    public function testPreflightScanCalculatesCountsAndSizes(): void
    {
        $sourceConfig = (new StorageConfiguration())->setName('src')->setProvider('s3');
        $targetConfig = (new StorageConfiguration())->setName('dst')->setProvider('azure');

        $sourceAdapterMock = $this->createMock(FilesystemAdapter::class);
        $sourceAdapterMock->method('listContents')
            ->willReturn([
                new FileAttributes('image1.jpg', 1024),
                new FileAttributes('image2.jpg', 2048),
            ]);

        $targetAdapterMock = $this->createMock(FilesystemAdapter::class);
        $targetAdapterMock->method('listContents')->willReturn([]);

        $sourceProviderMock = $this->createMock(StorageProviderInterface::class);
        $sourceProviderMock->method('getKey')->willReturn('s3');
        $sourceProviderMock->method('createAdapter')->willReturn($sourceAdapterMock);

        $targetProviderMock = $this->createMock(StorageProviderInterface::class);
        $targetProviderMock->method('getKey')->willReturn('azure');
        $targetProviderMock->method('createAdapter')->willReturn($targetAdapterMock);

        $registry = new StorageProviderRegistry();
        $registry->registerProvider($sourceProviderMock);
        $registry->registerProvider($targetProviderMock);

        $configRepoMock = $this->createMock(StorageConfigurationRepository::class);
        $jobRepoMock = $this->createMock(MigrationJobRepository::class);

        $orchestrator = new MigrationOrchestrator(
            $configRepoMock,
            $jobRepoMock,
            $registry,
            new NullLogger()
        );

        $scan = $orchestrator->preflightScan($sourceConfig, $targetConfig);

        $this->assertSame(2, $scan['total_files']);
        $this->assertSame(3072, $scan['total_bytes']);
        $this->assertTrue($scan['target_accessible']);
    }

    public function testMigrationCopiesFilesAndHandlesErrors(): void
    {
        $sourceConfig = (new StorageConfiguration())->setName('src')->setProvider('s3');
        $sourceConfig->setId(1);
        $targetConfig = (new StorageConfiguration())->setName('dst')->setProvider('s3');
        $targetConfig->setId(2);

        $stream = tmpfile();
        fwrite($stream, 'dummy binary content');
        rewind($stream);

        $sourceAdapterMock = $this->createMock(FilesystemAdapter::class);
        $sourceAdapterMock->method('listContents')
            ->willReturn([
                new FileAttributes('file1.pdf', 100),
                new FileAttributes('file2.pdf', 200),
            ]);
        $sourceAdapterMock->method('readStream')->willReturn($stream);

        $targetAdapterMock = $this->createMock(FilesystemAdapter::class);
        $targetAdapterMock->method('fileExists')->willReturn(false);
        $targetAdapterMock->expects($this->exactly(2))
            ->method('writeStream');

        $providerMock = $this->createMock(StorageProviderInterface::class);
        $providerMock->method('getKey')->willReturn('s3');
        $providerMock->method('createAdapter')
            ->willReturnOnConsecutiveCalls($sourceAdapterMock, $targetAdapterMock);

        $registry = new StorageProviderRegistry();
        $registry->registerProvider($providerMock);

        $configRepoMock = $this->createMock(StorageConfigurationRepository::class);
        $configRepoMock->method('findById')
            ->willReturnMap([
                [1, $sourceConfig],
                [2, $targetConfig],
            ]);

        $jobRepoMock = $this->createMock(MigrationJobRepository::class);

        $orchestrator = new MigrationOrchestrator(
            $configRepoMock,
            $jobRepoMock,
            $registry,
            new NullLogger()
        );

        $job = new MigrationJob();
        $job->setId(10);
        $job->setSourceConfigId(1);
        $job->setTargetConfigId(2);
        $job->setTotalFiles(2);
        $job->setTotalBytes(300);

        $orchestrator->runMigration($job);

        $this->assertSame(MigrationJob::STATUS_COMPLETED, $job->getStatus());
        $this->assertSame(2, $job->getProcessedFiles());
        $this->assertSame(0, $job->getFailedFiles());
    }
}
