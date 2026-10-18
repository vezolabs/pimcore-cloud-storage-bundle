<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Provider;

use Aws\S3\S3Client;
use InvalidArgumentException;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter;
use League\Flysystem\FilesystemAdapter;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;

class S3StorageProvider extends AbstractStorageProvider
{
    public function getKey(): string
    {
        return StorageConfiguration::PROVIDER_S3;
    }

    public function getDisplayName(): string
    {
        return 'Amazon S3 & S3-Compatible Storage';
    }

    public function validateConfiguration(StorageConfiguration $config): array
    {
        $errors = [];

        if (trim($config->getBucketOrContainer()) === '') {
            $errors['bucket_or_container'] = 'Bucket name is required.';
        } elseif (!preg_match('/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/', $config->getBucketOrContainer())) {
            $errors['bucket_or_container'] = 'Invalid bucket name format. Use 3-63 lowercase alphanumeric characters, dots, or hyphens.';
        }

        $endpoint = $config->getEndpoint();
        if ($endpoint !== null && $endpoint !== '') {
            if (!filter_var($endpoint, FILTER_VALIDATE_URL)) {
                $errors['endpoint'] = 'Endpoint must be a valid URL (e.g., https://s3.example.com).';
            }
        } else {
            // Standard AWS requires region
            if (trim((string)$config->getRegionOrProject()) === '') {
                $errors['region_or_project'] = 'AWS Region is required when using standard AWS S3.';
            }
        }

        if ($config->getAuthType() === StorageConfiguration::AUTH_S3_ACCESS_KEYS) {
            $creds = $config->getUnencryptedCredentials();
            $hasEncrypted = $config->getCredentialsEncrypted() !== null && $config->getCredentialsEncrypted() !== '';

            if (!$hasEncrypted && empty($creds['access_key_id'])) {
                $errors['access_key_id'] = 'Access Key ID is required for access key authentication.';
            }
            if (!$hasEncrypted && empty($creds['secret_access_key'])) {
                $errors['secret_access_key'] = 'Secret Access Key is required for access key authentication.';
            }
        }

        return $errors;
    }

    public function createAdapter(StorageConfiguration $config): FilesystemAdapter
    {
        $s3Client = $this->createClient($config);
        $bucket = $config->getBucketOrContainer();
        $prefix = (string)($config->getPathPrefix() ?? '');

        return new AwsS3V3Adapter(
            client: $s3Client,
            bucket: $bucket,
            prefix: $prefix,
            streamReads: true
        );
    }

    public function createClient(StorageConfiguration $config): S3Client
    {
        $region = $config->getRegionOrProject() ?: 'us-east-1';
        $clientConfig = [
            'version' => 'latest',
            'region' => $region,
        ];

        $endpoint = $config->getEndpoint();
        if ($endpoint !== null && $endpoint !== '') {
            $clientConfig['endpoint'] = $endpoint;
        }

        if ((bool)$config->getSetting('use_path_style_endpoint', false)) {
            $clientConfig['use_path_style_endpoint'] = true;
        }

        if ($config->getAuthType() === StorageConfiguration::AUTH_S3_ACCESS_KEYS) {
            $creds = $config->getUnencryptedCredentials() ?? [];
            if (!empty($creds['access_key_id']) && !empty($creds['secret_access_key'])) {
                $clientConfig['credentials'] = [
                    'key' => trim((string)$creds['access_key_id']),
                    'secret' => trim((string)$creds['secret_access_key']),
                ];
            }
        }
        // If AUTH_S3_IAM_ROLE, AWS SDK default credential chain handles instance profile / env / IAM roles automatically

        return new S3Client($clientConfig);
    }

    public function getPublicUrl(StorageConfiguration $config, string $path): ?string
    {
        $customPrefix = parent::getPublicUrl($config, $path);
        if ($customPrefix !== null) {
            return $customPrefix;
        }

        $bucket = $config->getBucketOrContainer();
        $region = $config->getRegionOrProject() ?: 'us-east-1';
        $fullPath = ltrim(($config->getPathPrefix() ? $config->getPathPrefix() . '/' : '') . ltrim($path, '/'), '/');

        if ($config->getEndpoint()) {
            return rtrim($config->getEndpoint(), '/') . '/' . $bucket . '/' . $fullPath;
        }

        return "https://{$bucket}.s3.{$region}.amazonaws.com/{$fullPath}";
    }
}
