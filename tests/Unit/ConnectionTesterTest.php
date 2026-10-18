<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Provider\StorageProviderInterface;
use Vezolabs\CloudStorageBundle\Provider\StorageProviderRegistry;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;
use Vezolabs\CloudStorageBundle\Service\ConnectionTester;

class ConnectionTesterTest extends TestCase
{
    public function testRunsProbeSuccessfully(): void
    {
        $config = new StorageConfiguration();
        $config->setName('s3-test');
        $config->setProvider(StorageConfiguration::PROVIDER_S3);

        $providerMock = $this->createMock(StorageProviderInterface::class);
        $providerMock->expects($this->once())
            ->method('testConnection')
            ->with($config)
            ->willReturn([
                'success' => true,
                'message' => 'Connection verified successfully.',
                'latency_ms' => 15.2,
                'details' => ['write_permission' => ['status' => 'passed']],
            ]);

        $registry = new StorageProviderRegistry([$providerMock]);
        $providerMock->method('getKey')->willReturn(StorageConfiguration::PROVIDER_S3);
        $registry->registerProvider($providerMock);

        $repoMock = $this->createStub(StorageConfigurationRepository::class);

        $tester = new ConnectionTester($registry, $repoMock);
        $result = $tester->testConfiguration($config);

        $this->assertTrue($result['success']);
        $this->assertSame(15.2, $result['latency_ms']);
    }

    public function testHandlesExceptionGracefully(): void
    {
        $config = new StorageConfiguration();
        $config->setName('s3-failing');
        $config->setProvider(StorageConfiguration::PROVIDER_S3);

        $providerMock = $this->createMock(StorageProviderInterface::class);
        $providerMock->method('getKey')->willReturn(StorageConfiguration::PROVIDER_S3);
        $providerMock->expects($this->once())
            ->method('testConnection')
            ->willThrowException(new \RuntimeException('Connection timed out'));

        $registry = new StorageProviderRegistry();
        $registry->registerProvider($providerMock);

        $repoMock = $this->createStub(StorageConfigurationRepository::class);

        $tester = new ConnectionTester($registry, $repoMock);
        $result = $tester->testConfiguration($config);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Connection timed out', $result['message']);
    }
}
