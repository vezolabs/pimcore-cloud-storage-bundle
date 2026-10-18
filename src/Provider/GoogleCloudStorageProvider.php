<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Provider;

use Google\Cloud\Storage\StorageClient;
use InvalidArgumentException;
use League\Flysystem\FilesystemAdapter;
use League\Flysystem\GoogleCloudStorage\GoogleCloudStorageAdapter;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;

class GoogleCloudStorageProvider extends AbstractStorageProvider
{
    public function getKey(): string
    {
        return StorageConfiguration::PROVIDER_GCS;
    }

    public function getDisplayName(): string
    {
        return 'Google Cloud Storage (GCS)';
    }

    public function validateConfiguration(StorageConfiguration $config): array
    {
        $errors = [];

        if (trim($config->getBucketOrContainer()) === '') {
            $errors['bucket_or_container'] = 'Google Cloud Storage bucket name is required.';
        }

        $authType = $config->getAuthType();
        $creds = $config->getUnencryptedCredentials() ?? [];
        $hasEncrypted = $config->getCredentialsEncrypted() !== null && $config->getCredentialsEncrypted() !== '';

        if ($authType === StorageConfiguration::AUTH_GCS_SERVICE_ACCOUNT) {
            if (!$hasEncrypted && empty($creds['service_account_json'])) {
                $errors['service_account_json'] = 'Service Account JSON key is required.';
            } else {
                $jsonRaw = $creds['service_account_json'] ?? null;
                if ($jsonRaw !== null && \is_string($jsonRaw) && trim($jsonRaw) !== '') {
                    $decoded = json_decode($jsonRaw, true);
                    if (!\is_array($decoded) || empty($decoded['client_email']) || empty($decoded['private_key'])) {
                        $errors['service_account_json'] = 'Invalid Service Account JSON format. Must contain client_email and private_key.';
                    }
                }
            }
        } elseif ($authType === StorageConfiguration::AUTH_GCS_ADC) {
            if (trim((string)$config->getRegionOrProject()) === '') {
                $errors['region_or_project'] = 'GCP Project ID is required for Application Default Credentials.';
            }
        }

        return $errors;
    }

    public function createAdapter(StorageConfiguration $config): FilesystemAdapter
    {
        $storageClient = $this->createClient($config);
        $bucket = $storageClient->bucket($config->getBucketOrContainer());
        $prefix = (string)($config->getPathPrefix() ?? '');

        return new GoogleCloudStorageAdapter(
            bucket: $bucket,
            prefix: $prefix
        );
    }

    public function createClient(StorageConfiguration $config): StorageClient
    {
        $clientConfig = [];

        $projectId = $config->getRegionOrProject();
        if ($projectId !== null && trim($projectId) !== '') {
            $clientConfig['projectId'] = trim($projectId);
        }

        $authType = $config->getAuthType();
        $creds = $config->getUnencryptedCredentials() ?? [];

        if ($authType === StorageConfiguration::AUTH_GCS_SERVICE_ACCOUNT && !empty($creds['service_account_json'])) {
            $rawJson = $creds['service_account_json'];
            $keyData = \is_array($rawJson) ? $rawJson : json_decode((string)$rawJson, true);
            if (\is_array($keyData)) {
                $clientConfig['keyFile'] = $keyData;
            }
        }
        // If AUTH_GCS_ADC, Google Cloud SDK reads GOOGLE_APPLICATION_CREDENTIALS or GKE/GCE metadata automatically

        return new StorageClient($clientConfig);
    }

    public function getPublicUrl(StorageConfiguration $config, string $path): ?string
    {
        $customPrefix = parent::getPublicUrl($config, $path);
        if ($customPrefix !== null) {
            return $customPrefix;
        }

        $bucket = $config->getBucketOrContainer();
        $fullPath = ltrim(($config->getPathPrefix() ? $config->getPathPrefix() . '/' : '') . ltrim($path, '/'), '/');

        return "https://storage.googleapis.com/{$bucket}/{$fullPath}";
    }
}
