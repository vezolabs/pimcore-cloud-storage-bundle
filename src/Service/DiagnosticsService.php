<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Service;

use Aws\S3\S3Client;
use Google\Cloud\Storage\StorageClient;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter;
use League\Flysystem\AzureBlobStorage\AzureBlobStorageAdapter;
use League\Flysystem\GoogleCloudStorage\GoogleCloudStorageAdapter;
use MicrosoftAzure\Storage\Blob\BlobRestProxy;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;

class DiagnosticsService
{
    public function __construct(
        private readonly StorageConfigurationRepository $configRepository,
        private readonly StorageManagerService $storageManager
    ) {
    }

    public function getDiagnostics(): array
    {
        $checks = [];
        $hasErrors = false;
        $hasWarnings = false;

        // 1. PHP Version
        $phpVersion = PHP_VERSION;
        $phpOk = version_compare($phpVersion, '8.2.0', '>=');
        $checks['php_version'] = [
            'name' => 'PHP Version',
            'status' => $phpOk ? 'ok' : 'error',
            'value' => $phpVersion,
            'message' => $phpOk ? 'PHP version satisfies requirements (>= 8.2)' : 'PHP version below 8.2',
        ];
        if (!$phpOk) {
            $hasErrors = true;
        }

        // 2. Required PHP Extensions
        $requiredExtensions = ['openssl', 'curl', 'mbstring', 'fileinfo', 'json'];
        $missingExtensions = [];
        foreach ($requiredExtensions as $ext) {
            if (!extension_loaded($ext)) {
                $missingExtensions[] = $ext;
            }
        }
        $checks['extensions'] = [
            'name' => 'Required PHP Extensions',
            'status' => empty($missingExtensions) ? 'ok' : 'error',
            'value' => empty($missingExtensions) ? 'All loaded (' . implode(', ', $requiredExtensions) . ')' : 'Missing: ' . implode(', ', $missingExtensions),
            'message' => empty($missingExtensions) ? 'All mandatory extensions loaded.' : 'Missing extensions may cause cloud operations to fail.',
        ];
        if (!empty($missingExtensions)) {
            $hasErrors = true;
        }

        // 3. Cloud Provider SDKs
        $sdks = [
            'AWS S3' => class_exists(S3Client::class) && class_exists(AwsS3V3Adapter::class),
            'Azure Blob' => class_exists(BlobRestProxy::class) && class_exists(AzureBlobStorageAdapter::class),
            'Google Cloud' => class_exists(StorageClient::class) && class_exists(GoogleCloudStorageAdapter::class),
        ];
        $allSdksLoaded = !in_array(false, $sdks, true);
        $checks['cloud_sdks'] = [
            'name' => 'Cloud Provider SDKs',
            'status' => $allSdksLoaded ? 'ok' : 'warning',
            'value' => implode(' | ', array_map(fn($name, $ok) => "{$name}: " . ($ok ? 'Ready' : 'Not Loaded'), array_keys($sdks), $sdks)),
            'message' => $allSdksLoaded ? 'Official SDKs and Flysystem adapters loaded for S3, Azure, and GCS.' : 'Some SDKs not detected.',
        ];
        if (!$allSdksLoaded) {
            $hasWarnings = true;
        }

        // 4. Credential Encryption Secret
        $hasSecret = !empty($_ENV['PIMCORE_ENCRYPTION_SECRET']) || !empty($_SERVER['PIMCORE_ENCRYPTION_SECRET']) || !empty($_ENV['APP_SECRET']);
        $checks['encryption_secret'] = [
            'name' => 'Credential Encryption Secret',
            'status' => $hasSecret ? 'ok' : 'warning',
            'value' => $hasSecret ? 'Configured (PIMCORE_ENCRYPTION_SECRET)' : 'Using Fallback Secret',
            'message' => $hasSecret ? 'Hardware/environment secret available for AES-256-GCM.' : 'Recommend defining PIMCORE_ENCRYPTION_SECRET in .env.local for production key isolation.',
        ];
        if (!$hasSecret) {
            $hasWarnings = true;
        }

        // 5. Active Storage Provider
        $activeConfig = $this->storageManager->getActiveConfiguration();
        $checks['active_storage'] = [
            'name' => 'Active Storage Provider',
            'status' => $activeConfig ? 'ok' : 'warning',
            'value' => $activeConfig ? ($activeConfig->getDisplayName() . ' (' . strtoupper($activeConfig->getProvider()) . ')') : 'Local Fallback',
            'message' => $activeConfig ? "Active bucket/container: '{$activeConfig->getBucketOrContainer()}'" : 'No cloud storage active. Using local disk.',
        ];

        // Overall status
        $status = 'healthy';
        if ($hasErrors) {
            $status = 'degraded';
        } elseif ($hasWarnings) {
            $status = 'warning';
        }

        return [
            'status' => $status,
            'summary' => $status === 'healthy' ? 'All systems operational. Cloud storage ready.' : 'Some warnings detected.',
            'checks' => $checks,
            'timestamp' => (new \DateTime())->format(\DateTimeInterface::ATOM),
        ];
    }
}
