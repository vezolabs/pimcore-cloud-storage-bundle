<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Provider\S3StorageProvider;

class S3StorageProviderTest extends TestCase
{
    private S3StorageProvider $provider;

    protected function setUp(): void
    {
        $this->provider = new S3StorageProvider();
    }

    public function testValidatesEmptyBucket(): void
    {
        $config = new StorageConfiguration();
        $config->setName('s3-test');
        $config->setProvider(StorageConfiguration::PROVIDER_S3);
        $config->setBucketOrContainer('');
        $config->setRegionOrProject('us-east-1');

        $errors = $this->provider->validateConfiguration($config);
        $this->assertArrayHasKey('bucket_or_container', $errors);
    }

    public function testValidatesInvalidBucketNaming(): void
    {
        $config = new StorageConfiguration();
        $config->setName('s3-test');
        $config->setProvider(StorageConfiguration::PROVIDER_S3);
        $config->setBucketOrContainer('INVALID_BUCKET_NAME_WITH_CAPS');

        $errors = $this->provider->validateConfiguration($config);
        $this->assertArrayHasKey('bucket_or_container', $errors);
    }

    public function testValidatesMissingRegionForStandardAws(): void
    {
        $config = new StorageConfiguration();
        $config->setName('s3-test');
        $config->setProvider(StorageConfiguration::PROVIDER_S3);
        $config->setBucketOrContainer('valid-bucket-name');
        $config->setRegionOrProject('');

        $errors = $this->provider->validateConfiguration($config);
        $this->assertArrayHasKey('region_or_project', $errors);
    }

    public function testAllowsCustomEndpointWithoutAwsRegion(): void
    {
        $config = new StorageConfiguration();
        $config->setName('minio-test');
        $config->setProvider(StorageConfiguration::PROVIDER_S3);
        $config->setBucketOrContainer('valid-bucket-name');
        $config->setEndpoint('https://minio.company.com:9000');
        $config->setAuthType(StorageConfiguration::AUTH_S3_ACCESS_KEYS);
        $config->setUnencryptedCredentials([
            'access_key_id' => 'minioadmin',
            'secret_access_key' => 'minioadmin',
        ]);

        $errors = $this->provider->validateConfiguration($config);
        $this->assertEmpty($errors);
    }

    public function testPublicUrlGeneration(): void
    {
        $config = new StorageConfiguration();
        $config->setName('s3-test');
        $config->setProvider(StorageConfiguration::PROVIDER_S3);
        $config->setBucketOrContainer('my-pimcore-bucket');
        $config->setRegionOrProject('eu-central-1');
        $config->setPathPrefix('media');

        $url = $this->provider->getPublicUrl($config, 'products/item1.jpg');
        $this->assertSame('https://my-pimcore-bucket.s3.eu-central-1.amazonaws.com/media/products/item1.jpg', $url);

        // With custom CDN
        $config->setSetting('public_url_prefix', 'https://cdn.example.com');
        $cdnUrl = $this->provider->getPublicUrl($config, 'products/item1.jpg');
        $this->assertSame('https://cdn.example.com/products/item1.jpg', $cdnUrl);
    }
}
