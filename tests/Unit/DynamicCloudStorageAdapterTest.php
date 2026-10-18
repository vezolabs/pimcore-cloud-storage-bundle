<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Tests\Unit;

use League\Flysystem\Config;
use League\Flysystem\FilesystemAdapter;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Flysystem\CloudStorageAdapterFactory;
use Vezolabs\CloudStorageBundle\Flysystem\DynamicCloudStorageAdapter;
use Vezolabs\CloudStorageBundle\Service\StorageManagerService;

class DynamicCloudStorageAdapterTest extends TestCase
{
    public function testDelegatesToLocalFallbackWhenNoActiveConfig(): void
    {
        $localMock = $this->createMock(FilesystemAdapter::class);
        $localMock->expects($this->once())
            ->method('fileExists')
            ->with('sample.jpg')
            ->willReturn(true);

        $storageManagerMock = $this->createMock(StorageManagerService::class);
        $storageManagerMock->method('getActiveConfiguration')->willReturn(null);

        $factoryMock = $this->createMock(CloudStorageAdapterFactory::class);

        $dynamicAdapter = new DynamicCloudStorageAdapter(
            localFallback: $localMock,
            storageManager: $storageManagerMock,
            adapterFactory: $factoryMock,
            logger: new NullLogger(),
            storageType: 'asset'
        );

        $this->assertTrue($dynamicAdapter->fileExists('sample.jpg'));
        $this->assertSame('local', $dynamicAdapter->getActiveConfigName());
    }

    public function testDelegatesToCloudAdapterWhenActive(): void
    {
        $localMock = $this->createMock(FilesystemAdapter::class);
        $cloudMock = $this->createMock(FilesystemAdapter::class);

        $cloudMock->expects($this->once())
            ->method('write')
            ->with('folder/test.txt', 'hello world', $this->isInstanceOf(Config::class));

        $activeConfig = new StorageConfiguration();
        $activeConfig->setName('s3-active');
        $activeConfig->setProvider(StorageConfiguration::PROVIDER_S3);
        $activeConfig->setBucketOrContainer('my-bucket');

        $storageManagerMock = $this->createMock(StorageManagerService::class);
        $storageManagerMock->method('getActiveConfiguration')->willReturn($activeConfig);

        $factoryMock = $this->createMock(CloudStorageAdapterFactory::class);
        $factoryMock->expects($this->once())
            ->method('createAdapter')
            ->with($activeConfig)
            ->willReturn($cloudMock);

        $dynamicAdapter = new DynamicCloudStorageAdapter(
            localFallback: $localMock,
            storageManager: $storageManagerMock,
            adapterFactory: $factoryMock,
            logger: new NullLogger(),
            storageType: 'asset'
        );

        $dynamicAdapter->write('folder/test.txt', 'hello world', new Config());
        $this->assertSame('s3-active', $dynamicAdapter->getActiveConfigName());
    }

    public function testResetAdapterCache(): void
    {
        $localMock = $this->createMock(FilesystemAdapter::class);
        $cloudMock1 = $this->createMock(FilesystemAdapter::class);
        $cloudMock2 = $this->createMock(FilesystemAdapter::class);

        $config1 = (new StorageConfiguration())->setName('s3-1')->setProvider(StorageConfiguration::PROVIDER_S3);
        $config2 = (new StorageConfiguration())->setName('s3-2')->setProvider(StorageConfiguration::PROVIDER_S3);

        $storageManagerMock = $this->createMock(StorageManagerService::class);
        $storageManagerMock->method('getActiveConfiguration')
            ->willReturnOnConsecutiveCalls($config1, $config2);

        $factoryMock = $this->createMock(CloudStorageAdapterFactory::class);
        $factoryMock->expects($this->exactly(2))
            ->method('createAdapter')
            ->willReturnOnConsecutiveCalls($cloudMock1, $cloudMock2);

        $dynamicAdapter = new DynamicCloudStorageAdapter(
            localFallback: $localMock,
            storageManager: $storageManagerMock,
            adapterFactory: $factoryMock,
            logger: new NullLogger()
        );

        // First call caches config1
        $dynamicAdapter->getResolvedAdapter();
        $this->assertSame('s3-1', $dynamicAdapter->getActiveConfigName());

        // Invalidate cache
        $dynamicAdapter->resetAdapterCache();

        // Second call resolves config2
        $dynamicAdapter->getResolvedAdapter();
        $this->assertSame('s3-2', $dynamicAdapter->getActiveConfigName());
    }
}
