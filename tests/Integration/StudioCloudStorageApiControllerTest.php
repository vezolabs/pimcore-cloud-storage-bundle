<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Tests\Integration;

use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Vezolabs\CloudStorageBundle\Controller\Api\StudioCloudStorageApiController;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Provider\StorageProviderRegistry;
use Vezolabs\CloudStorageBundle\Repository\ConfigAuditLogRepository;
use Vezolabs\CloudStorageBundle\Repository\MigrationJobRepository;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;
use Vezolabs\CloudStorageBundle\Service\ConnectionTester;
use Vezolabs\CloudStorageBundle\Service\DiagnosticsService;
use Vezolabs\CloudStorageBundle\Service\MigrationOrchestrator;
use Vezolabs\CloudStorageBundle\Service\StorageManagerService;

class StudioCloudStorageApiControllerTest extends TestCase
{
    private StorageConfigurationRepository $configRepoMock;
    private MigrationJobRepository $jobRepoMock;
    private ConfigAuditLogRepository $auditRepoMock;
    private StorageProviderRegistry $providerRegistryMock;
    private ConnectionTester $testerMock;
    private StorageManagerService $storageManagerMock;
    private MigrationOrchestrator $orchestratorMock;
    private DiagnosticsService $diagnosticsMock;

    protected function setUp(): void
    {
        $this->configRepoMock = $this->createStub(StorageConfigurationRepository::class);
        $this->jobRepoMock = $this->createStub(MigrationJobRepository::class);
        $this->auditRepoMock = $this->createStub(ConfigAuditLogRepository::class);
        $this->providerRegistryMock = $this->createStub(StorageProviderRegistry::class);
        $this->testerMock = $this->createStub(ConnectionTester::class);
        $this->storageManagerMock = $this->createStub(StorageManagerService::class);
        $this->orchestratorMock = $this->createStub(MigrationOrchestrator::class);
        $this->diagnosticsMock = $this->createStub(DiagnosticsService::class);
    }

    private function createController(): StudioCloudStorageApiController
    {
        return new StudioCloudStorageApiController(
            $this->configRepoMock,
            $this->jobRepoMock,
            $this->auditRepoMock,
            $this->providerRegistryMock,
            $this->testerMock,
            $this->storageManagerMock,
            $this->orchestratorMock,
            $this->diagnosticsMock
        );
    }

    public function testOverviewThrowsWhenUnauthenticated(): void
    {
        $controller = $this->createController();

        $this->expectException(AccessDeniedException::class);
        $controller->overview();
    }

    public function testListConfigurationsThrowsWhenUnauthenticated(): void
    {
        $controller = $this->createController();

        $this->expectException(AccessDeniedException::class);
        $controller->listConfigurations();
    }

    public function testCreateConfigurationThrowsWhenUnauthenticated(): void
    {
        $controller = $this->createController();
        $request = new Request([], [], [], [], [], [], json_encode(['name' => 'test']));

        $this->expectException(AccessDeniedException::class);
        $controller->createConfiguration($request);
    }

    public function testActivateConfigurationThrowsWhenUnauthenticated(): void
    {
        $controller = $this->createController();

        $this->expectException(AccessDeniedException::class);
        $controller->activateConfiguration(1);
    }
}
