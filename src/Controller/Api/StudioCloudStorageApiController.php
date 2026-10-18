<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Controller\Api;

use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Throwable;
use Vezolabs\CloudStorageBundle\Entity\ConfigAuditLog;
use Vezolabs\CloudStorageBundle\Entity\MigrationJob;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Provider\StorageProviderRegistry;
use Vezolabs\CloudStorageBundle\Repository\ConfigAuditLogRepository;
use Vezolabs\CloudStorageBundle\Repository\MigrationJobRepository;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;
use Vezolabs\CloudStorageBundle\Security\SecretSanitizer;
use Vezolabs\CloudStorageBundle\Service\ConnectionTester;
use Vezolabs\CloudStorageBundle\Service\DiagnosticsService;
use Vezolabs\CloudStorageBundle\Service\MigrationOrchestrator;
use Vezolabs\CloudStorageBundle\Service\StorageManagerService;
use Vezolabs\CloudStorageBundle\VezolabsCloudStorageBundle;

#[Route('/pimcore-studio/api/cloud-storage')]
class StudioCloudStorageApiController extends AbstractController
{
    public function __construct(
        private readonly StorageConfigurationRepository $configurationRepository,
        private readonly MigrationJobRepository $migrationJobRepository,
        private readonly ConfigAuditLogRepository $auditLogRepository,
        private readonly StorageProviderRegistry $providerRegistry,
        private readonly ConnectionTester $connectionTester,
        private readonly StorageManagerService $storageManager,
        private readonly MigrationOrchestrator $migrationOrchestrator,
        private readonly DiagnosticsService $diagnosticsService
    ) {
    }

    /**
     * Dashboard Overview Metrics.
     */
    #[Route('/overview', name: 'vezolabs_cloud_storage_api_overview', methods: ['GET'])]
    public function overview(): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_VIEW);

        $configs = $this->configurationRepository->findAll();
        $activeConfig = $this->storageManager->getActiveConfiguration();
        $diagnostics = $this->diagnosticsService->getDiagnostics();
        $activeMigration = $this->migrationJobRepository->findActiveJob();

        $testedCount = 0;
        $failedCount = 0;
        foreach ($configs as $cfg) {
            if ($cfg->getLastTestStatus() === StorageConfiguration::TEST_STATUS_SUCCESS) {
                $testedCount++;
            } elseif ($cfg->getLastTestStatus() === StorageConfiguration::TEST_STATUS_FAILED) {
                $failedCount++;
            }
        }

        return new JsonResponse([
            'status' => $diagnostics['status'],
            'active_configuration' => $activeConfig?->toArray(false),
            'total_configurations' => \count($configs),
            'tested_successful' => $testedCount,
            'tested_failed' => $failedCount,
            'is_cloud_active' => $activeConfig !== null && $activeConfig->getProvider() !== StorageConfiguration::PROVIDER_LOCAL,
            'active_migration' => $activeMigration?->toArray(),
            'diagnostics_summary' => $diagnostics['summary'],
            'available_providers' => [
                [
                    'key' => StorageConfiguration::PROVIDER_S3,
                    'name' => 'Amazon S3 & S3-Compatible',
                    'description' => 'Scalable object storage for AWS, MinIO, Ceph, Cloudflare R2, and Wasabi.',
                ],
                [
                    'key' => StorageConfiguration::PROVIDER_AZURE,
                    'name' => 'Microsoft Azure Blob Storage',
                    'description' => 'Massively scalable and secure object storage for cloud-native workloads.',
                ],
                [
                    'key' => StorageConfiguration::PROVIDER_GCS,
                    'name' => 'Google Cloud Storage',
                    'description' => 'High-performance, unified object storage for Google Cloud Platform.',
                ],
            ],
        ]);
    }

    /**
     * List all configurations.
     */
    #[Route('/configurations', name: 'vezolabs_cloud_storage_api_list_configs', methods: ['GET'])]
    public function listConfigurations(): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_VIEW);

        $configs = $this->configurationRepository->findAll();
        $data = array_map(fn(StorageConfiguration $c) => $c->toArray(false), $configs);

        return new JsonResponse(['items' => $data]);
    }

    /**
     * Get single configuration.
     */
    #[Route('/configurations/{id}', name: 'vezolabs_cloud_storage_api_get_config', methods: ['GET'])]
    public function getConfiguration(int $id): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_VIEW);

        $config = $this->configurationRepository->findById($id);
        if ($config === null) {
            return new JsonResponse(['error' => 'Configuration not found.'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($config->toArray(false));
    }

    /**
     * Create new configuration.
     */
    #[Route('/configurations', name: 'vezolabs_cloud_storage_api_create_config', methods: ['POST'])]
    public function createConfiguration(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_MANAGE);

        $payload = json_decode($request->getContent(), true);
        if (!\is_array($payload)) {
            return new JsonResponse(['error' => 'Invalid JSON body.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $config = new StorageConfiguration();
            $config->setName($payload['name'] ?? '');
            $config->setDisplayName($payload['display_name'] ?? $config->getName());
            $config->setProvider($payload['provider'] ?? StorageConfiguration::PROVIDER_S3);
            $config->setBucketOrContainer($payload['bucket_or_container'] ?? '');
            $config->setRegionOrProject($payload['region_or_project'] ?? null);
            $config->setEndpoint($payload['endpoint'] ?? null);
            $config->setPathPrefix($payload['path_prefix'] ?? null);
            $config->setAuthType($payload['auth_type'] ?? StorageConfiguration::AUTH_S3_ACCESS_KEYS);
            $config->setSettings($payload['settings'] ?? []);

            if (isset($payload['credentials']) && \is_array($payload['credentials'])) {
                $config->setUnencryptedCredentials($payload['credentials']);
            }

            // Validate using provider
            $provider = $this->providerRegistry->get($config->getProvider());
            $errors = $provider->validateConfiguration($config);
            if (!empty($errors)) {
                return new JsonResponse(['error' => 'Validation failed.', 'details' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Check name uniqueness
            $existing = $this->configurationRepository->findByName($config->getName());
            if ($existing !== null) {
                return new JsonResponse(['error' => "Configuration with name '{$config->getName()}' already exists."], Response::HTTP_CONFLICT);
            }

            $user = $this->getCurrentUsername();
            $this->configurationRepository->save($config, $user);

            return new JsonResponse($config->toArray(false), Response::HTTP_CREATED);
        } catch (Throwable $e) {
            return new JsonResponse(['error' => SecretSanitizer::sanitizeString($e->getMessage())], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Update existing configuration.
     */
    #[Route('/configurations/{id}', name: 'vezolabs_cloud_storage_api_update_config', methods: ['PUT'])]
    public function updateConfiguration(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_MANAGE);

        $config = $this->configurationRepository->findById($id);
        if ($config === null) {
            return new JsonResponse(['error' => 'Configuration not found.'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent(), true);
        if (!\is_array($payload)) {
            return new JsonResponse(['error' => 'Invalid JSON body.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            if (isset($payload['display_name'])) {
                $config->setDisplayName($payload['display_name']);
            }
            if (isset($payload['bucket_or_container'])) {
                $config->setBucketOrContainer($payload['bucket_or_container']);
            }
            if (array_key_exists('region_or_project', $payload)) {
                $config->setRegionOrProject($payload['region_or_project']);
            }
            if (array_key_exists('endpoint', $payload)) {
                $config->setEndpoint($payload['endpoint']);
            }
            if (array_key_exists('path_prefix', $payload)) {
                $config->setPathPrefix($payload['path_prefix']);
            }
            if (isset($payload['auth_type'])) {
                $config->setAuthType($payload['auth_type']);
            }
            if (isset($payload['settings']) && \is_array($payload['settings'])) {
                $config->setSettings($payload['settings']);
            }

            // If new credentials submitted, update them; otherwise preserve existing encrypted
            if (isset($payload['credentials']) && \is_array($payload['credentials']) && !empty($payload['credentials'])) {
                $config->setUnencryptedCredentials($payload['credentials']);
            }

            $provider = $this->providerRegistry->get($config->getProvider());
            $errors = $provider->validateConfiguration($config);
            if (!empty($errors)) {
                return new JsonResponse(['error' => 'Validation failed.', 'details' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $user = $this->getCurrentUsername();
            $this->configurationRepository->save($config, $user);

            // Invalidate cache if active configuration was updated
            if ($config->isActive()) {
                $this->storageManager->invalidateCache();
            }

            return new JsonResponse($config->toArray(false));
        } catch (Throwable $e) {
            return new JsonResponse(['error' => SecretSanitizer::sanitizeString($e->getMessage())], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Delete configuration.
     */
    #[Route('/configurations/{id}', name: 'vezolabs_cloud_storage_api_delete_config', methods: ['DELETE'])]
    public function deleteConfiguration(int $id): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_MANAGE);

        try {
            $user = $this->getCurrentUsername();
            $this->configurationRepository->delete($id, $user);

            return new JsonResponse(['success' => true]);
        } catch (Throwable $e) {
            return new JsonResponse(['error' => SecretSanitizer::sanitizeString($e->getMessage())], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Test connection for an unsaved/draft configuration (from Guided Wizard).
     */
    #[Route('/configurations/test', name: 'vezolabs_cloud_storage_api_test_draft', methods: ['POST'])]
    public function testDraft(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_MANAGE);

        $payload = json_decode($request->getContent(), true);
        if (!\is_array($payload)) {
            return new JsonResponse(['error' => 'Invalid JSON body.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $config = new StorageConfiguration();
            $config->setName($payload['name'] ?? 'draft-test');
            $config->setProvider($payload['provider'] ?? StorageConfiguration::PROVIDER_S3);
            $config->setBucketOrContainer($payload['bucket_or_container'] ?? '');
            $config->setRegionOrProject($payload['region_or_project'] ?? null);
            $config->setEndpoint($payload['endpoint'] ?? null);
            $config->setPathPrefix($payload['path_prefix'] ?? null);
            $config->setAuthType($payload['auth_type'] ?? StorageConfiguration::AUTH_S3_ACCESS_KEYS);
            $config->setSettings($payload['settings'] ?? []);

            if (isset($payload['credentials']) && \is_array($payload['credentials'])) {
                $config->setUnencryptedCredentials($payload['credentials']);
            }

            $result = $this->connectionTester->testConfiguration($config);

            return new JsonResponse($result);
        } catch (Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Test failed: ' . SecretSanitizer::sanitizeString($e->getMessage()),
            ]);
        }
    }

    /**
     * Test connection for a saved configuration by ID.
     */
    #[Route('/configurations/{id}/test', name: 'vezolabs_cloud_storage_api_test_saved', methods: ['POST'])]
    public function testSaved(int $id): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_MANAGE);

        try {
            $user = $this->getCurrentUsername();
            $result = $this->connectionTester->testById($id, $user);

            return new JsonResponse($result);
        } catch (Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Test execution error: ' . SecretSanitizer::sanitizeString($e->getMessage()),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Activate a configuration.
     */
    #[Route('/configurations/{id}/activate', name: 'vezolabs_cloud_storage_api_activate', methods: ['POST'])]
    public function activateConfiguration(int $id): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_MANAGE);

        try {
            $user = $this->getCurrentUsername();
            $activeConfig = $this->storageManager->activate($id, $user);

            return new JsonResponse([
                'success' => true,
                'message' => "Configuration '{$activeConfig->getDisplayName()}' is now active.",
                'configuration' => $activeConfig->toArray(false),
            ]);
        } catch (Throwable $e) {
            return new JsonResponse(['error' => SecretSanitizer::sanitizeString($e->getMessage())], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Preflight scan for asset migration.
     */
    #[Route('/migrations/preflight', name: 'vezolabs_cloud_storage_api_migration_preflight', methods: ['POST'])]
    public function migrationPreflight(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_MANAGE);

        $payload = json_decode($request->getContent(), true) ?? [];
        $sourceId = isset($payload['source_id']) ? (int)$payload['source_id'] : null;
        $targetId = isset($payload['target_id']) ? (int)$payload['target_id'] : null;

        if (!$targetId) {
            return new JsonResponse(['error' => 'Target configuration ID is required.'], Response::HTTP_BAD_REQUEST);
        }

        $source = $sourceId ? $this->configurationRepository->findById($sourceId) : $this->storageManager->getActiveConfiguration();
        $target = $this->configurationRepository->findById($targetId);

        if ($target === null) {
            return new JsonResponse(['error' => 'Target configuration not found.'], Response::HTTP_NOT_FOUND);
        }

        if ($source === null) {
            // Default to local
            $source = new StorageConfiguration();
            $source->setName('local');
            $source->setDisplayName('Local Storage');
            $source->setProvider(StorageConfiguration::PROVIDER_LOCAL);
        }

        try {
            $report = $this->migrationOrchestrator->preflightScan($source, $target);

            return new JsonResponse([
                'source' => $source->toArray(false),
                'target' => $target->toArray(false),
                'report' => $report,
            ]);
        } catch (Throwable $e) {
            return new JsonResponse(['error' => 'Preflight scan failed: ' . SecretSanitizer::sanitizeString($e->getMessage())], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Start a migration job.
     */
    #[Route('/migrations/start', name: 'vezolabs_cloud_storage_api_migration_start', methods: ['POST'])]
    public function startMigration(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_MANAGE);

        $payload = json_decode($request->getContent(), true) ?? [];
        $sourceId = isset($payload['source_id']) ? (int)$payload['source_id'] : null;
        $targetId = isset($payload['target_id']) ? (int)$payload['target_id'] : null;
        $isDryRun = (bool)($payload['dry_run'] ?? false);

        if (!$targetId) {
            return new JsonResponse(['error' => 'Target configuration ID is required.'], Response::HTTP_BAD_REQUEST);
        }

        $source = $sourceId ? $this->configurationRepository->findById($sourceId) : $this->storageManager->getActiveConfiguration();
        $target = $this->configurationRepository->findById($targetId);

        if ($target === null) {
            return new JsonResponse(['error' => 'Target configuration not found.'], Response::HTTP_NOT_FOUND);
        }

        $user = $this->getCurrentUsername();

        $job = new MigrationJob();
        $job->setSourceConfigId($source?->getId());
        $job->setTargetConfigId($target->getId());
        $job->setSourceName($source?->getName() ?? 'local');
        $job->setTargetName($target->getName());
        $job->setIsDryRun($isDryRun);
        $job->setInitiatedBy($user);

        // Preflight counts
        try {
            $preflight = $this->migrationOrchestrator->preflightScan(
                $source ?? (new StorageConfiguration())->setProvider(StorageConfiguration::PROVIDER_LOCAL),
                $target
            );
            $job->setTotalFiles($preflight['total_files']);
            $job->setTotalBytes($preflight['total_bytes']);
        } catch (Throwable) {
            // Count will update during execution
        }

        $this->migrationJobRepository->save($job);

        // Execute batch or complete migration
        $this->migrationOrchestrator->runMigration($job);

        return new JsonResponse($job->toArray(), Response::HTTP_CREATED);
    }

    /**
     * Get migration job status.
     */
    #[Route('/migrations/{id}/status', name: 'vezolabs_cloud_storage_api_migration_status', methods: ['GET'])]
    public function migrationStatus(int $id): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_VIEW);

        $job = $this->migrationJobRepository->findById($id);
        if ($job === null) {
            return new JsonResponse(['error' => 'Migration job not found.'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($job->toArray());
    }

    /**
     * System Diagnostics.
     */
    #[Route('/diagnostics', name: 'vezolabs_cloud_storage_api_diagnostics', methods: ['GET'])]
    public function diagnostics(): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_VIEW);

        return new JsonResponse($this->diagnosticsService->getDiagnostics());
    }

    /**
     * Configuration History / Audit Log.
     */
    #[Route('/history', name: 'vezolabs_cloud_storage_api_history', methods: ['GET'])]
    public function history(): JsonResponse
    {
        $this->denyAccessUnlessGrantedPermission(VezolabsCloudStorageBundle::PERMISSION_VIEW);

        $logs = $this->auditLogRepository->findRecent(50);
        $data = array_map(fn(ConfigAuditLog $l) => $l->toArray(), $logs);

        return new JsonResponse(['items' => $data]);
    }

    private function denyAccessUnlessGrantedPermission(string $permission): void
    {
        $user = null;
        try {
            $user = $this->getUser();
        } catch (\Throwable) {
            $user = null;
        }

        if ($user === null) {
            throw new AccessDeniedException('You must be logged into Pimcore Studio to access Cloud Storage management.');
        }

        $pimcoreUser = null;
        if ($user instanceof \Pimcore\Security\User\User) {
            $pimcoreUser = $user->getUser();
        } elseif ($user instanceof \Pimcore\Model\User) {
            $pimcoreUser = $user;
        } elseif (method_exists($user, 'getUser')) {
            $pimcoreUser = $user->getUser();
        }

        if ($pimcoreUser instanceof \Pimcore\Model\User) {
            if ($pimcoreUser->isAdmin() || $pimcoreUser->isAllowed($permission)) {
                return;
            }
        }

        try {
            if ($this->isGranted($permission)) {
                return;
            }
        } catch (\Throwable) {
            // Container not initialized
        }

        throw new AccessDeniedException("Access denied: requires {$permission} permission.");
    }

    private function getCurrentUsername(): string
    {
        $user = null;
        try {
            $user = $this->getUser();
        } catch (\Throwable) {
            $user = null;
        }

        if ($user instanceof \Pimcore\Security\User\User) {
            return $user->getUser()->getUsername();
        }
        if ($user instanceof \Pimcore\Model\User) {
            return $user->getUsername();
        }
        if ($user && method_exists($user, 'getUserIdentifier')) {
            return $user->getUserIdentifier();
        }

        return 'admin';
    }
}
