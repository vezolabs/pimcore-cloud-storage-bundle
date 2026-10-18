<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Provider\GoogleCloudStorageProvider;

class GoogleCloudStorageProviderTest extends TestCase
{
    private GoogleCloudStorageProvider $provider;

    protected function setUp(): void
    {
        $this->provider = new GoogleCloudStorageProvider();
    }

    public function testValidatesEmptyBucket(): void
    {
        $config = new StorageConfiguration();
        $config->setName('gcs-test');
        $config->setProvider(StorageConfiguration::PROVIDER_GCS);
        $config->setBucketOrContainer('');

        $errors = $this->provider->validateConfiguration($config);
        $this->assertArrayHasKey('bucket_or_container', $errors);
    }

    public function testValidatesInvalidServiceAccountJson(): void
    {
        $config = new StorageConfiguration();
        $config->setName('gcs-test');
        $config->setProvider(StorageConfiguration::PROVIDER_GCS);
        $config->setBucketOrContainer('my-gcp-bucket');
        $config->setAuthType(StorageConfiguration::AUTH_GCS_SERVICE_ACCOUNT);
        $config->setUnencryptedCredentials([
            'service_account_json' => 'not-valid-json',
        ]);

        $errors = $this->provider->validateConfiguration($config);
        $this->assertArrayHasKey('service_account_json', $errors);
    }

    public function testValidatesValidServiceAccountJson(): void
    {
        $validJson = json_encode([
            'client_email' => 'pimcore@project.iam.gserviceaccount.com',
            'private_key' => '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----',
        ]);

        $config = new StorageConfiguration();
        $config->setName('gcs-test');
        $config->setProvider(StorageConfiguration::PROVIDER_GCS);
        $config->setBucketOrContainer('my-gcp-bucket');
        $config->setAuthType(StorageConfiguration::AUTH_GCS_SERVICE_ACCOUNT);
        $config->setUnencryptedCredentials([
            'service_account_json' => $validJson,
        ]);

        $errors = $this->provider->validateConfiguration($config);
        $this->assertEmpty($errors);
    }

    public function testPublicUrlGeneration(): void
    {
        $config = new StorageConfiguration();
        $config->setName('gcs-test');
        $config->setProvider(StorageConfiguration::PROVIDER_GCS);
        $config->setBucketOrContainer('my-gcp-bucket');
        $config->setPathPrefix('pimcore');

        $url = $this->provider->getPublicUrl($config, 'photos/pic.jpg');
        $this->assertSame('https://storage.googleapis.com/my-gcp-bucket/pimcore/photos/pic.jpg', $url);
    }
}
