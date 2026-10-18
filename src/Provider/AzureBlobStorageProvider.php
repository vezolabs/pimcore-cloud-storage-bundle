<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Provider;

use League\Flysystem\AzureBlobStorage\AzureBlobStorageAdapter;
use League\Flysystem\FilesystemAdapter;
use MicrosoftAzure\Storage\Blob\BlobRestProxy;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;

class AzureBlobStorageProvider extends AbstractStorageProvider
{
    public function getKey(): string
    {
        return StorageConfiguration::PROVIDER_AZURE;
    }

    public function getDisplayName(): string
    {
        return 'Microsoft Azure Blob Storage';
    }

    public function validateConfiguration(StorageConfiguration $config): array
    {
        $errors = [];

        if (trim($config->getBucketOrContainer()) === '') {
            $errors['bucket_or_container'] = 'Azure container name is required.';
        } elseif (!preg_match('/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/', $config->getBucketOrContainer())) {
            $errors['bucket_or_container'] = 'Invalid container name format. Use 3-63 lowercase alphanumeric characters or hyphens.';
        }

        $authType = $config->getAuthType();
        $creds = $config->getUnencryptedCredentials() ?? [];
        $hasEncrypted = $config->getCredentialsEncrypted() !== null && $config->getCredentialsEncrypted() !== '';

        if ($authType === StorageConfiguration::AUTH_AZURE_CONNECTION_STRING) {
            if (!$hasEncrypted && empty($creds['connection_string'])) {
                $errors['connection_string'] = 'Azure connection string is required.';
            }
        } elseif ($authType === StorageConfiguration::AUTH_AZURE_ACCOUNT_KEY) {
            if (trim((string)$config->getRegionOrProject()) === '') {
                $errors['region_or_project'] = 'Storage Account Name is required.';
            }
            if (!$hasEncrypted && empty($creds['account_key'])) {
                $errors['account_key'] = 'Storage Account Key is required.';
            }
        }

        return $errors;
    }

    public function createAdapter(StorageConfiguration $config): FilesystemAdapter
    {
        $client = $this->createClient($config);
        $container = $config->getBucketOrContainer();
        $prefix = (string)($config->getPathPrefix() ?? '');

        return new AzureBlobStorageAdapter(
            client: $client,
            container: $container,
            prefix: $prefix
        );
    }

    public function createClient(StorageConfiguration $config): BlobRestProxy
    {
        $authType = $config->getAuthType();
        $creds = $config->getUnencryptedCredentials() ?? [];

        if ($authType === StorageConfiguration::AUTH_AZURE_CONNECTION_STRING) {
            $connStr = trim((string)($creds['connection_string'] ?? ''));

            return BlobRestProxy::createBlobService($connStr);
        }

        $accountName = trim((string)($config->getRegionOrProject() ?? ''));
        $accountKey = trim((string)($creds['account_key'] ?? ''));
        $endpoint = $config->getEndpoint();

        $endpointStr = $endpoint && $endpoint !== ''
            ? rtrim($endpoint, '/')
            : sprintf('https://%s.blob.core.windows.net', $accountName);

        $connStr = sprintf(
            'DefaultEndpointsProtocol=https;AccountName=%s;AccountKey=%s;BlobEndpoint=%s;',
            $accountName,
            $accountKey,
            $endpointStr
        );

        return BlobRestProxy::createBlobService($connStr);
    }

    public function getPublicUrl(StorageConfiguration $config, string $path): ?string
    {
        $customPrefix = parent::getPublicUrl($config, $path);
        if ($customPrefix !== null) {
            return $customPrefix;
        }

        $accountName = $config->getRegionOrProject();
        $container = $config->getBucketOrContainer();
        $fullPath = ltrim(($config->getPathPrefix() ? $config->getPathPrefix() . '/' : '') . ltrim($path, '/'), '/');

        if ($accountName) {
            return "https://{$accountName}.blob.core.windows.net/{$container}/{$fullPath}";
        }

        return null;
    }
}
