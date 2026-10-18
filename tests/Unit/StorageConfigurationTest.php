<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Tests\Unit;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;

class StorageConfigurationTest extends TestCase
{
    public function testSlugifiesName(): void
    {
        $config = new StorageConfiguration();
        $config->setName('My Production S3 Bucket!');

        $this->assertSame('my-production-s3-bucket', $config->getName());
    }

    public function testInvalidNameThrows(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $config = new StorageConfiguration();
        $config->setName('!!!###');
    }

    public function testProviderValidation(): void
    {
        $config = new StorageConfiguration();
        $config->setProvider(StorageConfiguration::PROVIDER_S3);
        $this->assertSame('s3', $config->getProvider());

        $this->expectException(InvalidArgumentException::class);
        $config->setProvider('invalid_cloud');
    }

    public function testToArrayNeverExposesSecretsByDefault(): void
    {
        $config = new StorageConfiguration();
        $config->setName('s3-prod');
        $config->setDisplayName('Production S3');
        $config->setProvider(StorageConfiguration::PROVIDER_S3);
        $config->setBucketOrContainer('my-bucket');
        $config->setAuthType(StorageConfiguration::AUTH_S3_ACCESS_KEYS);
        $config->setUnencryptedCredentials([
            'access_key_id' => 'AKIAIOSFODNN7EXAMPLE',
            'secret_access_key' => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        ]);

        $publicArray = $config->toArray(false);

        $this->assertArrayNotHasKey('credentials', $publicArray);
        $this->assertArrayHasKey('credentials_masked', $publicArray);
        $this->assertTrue($publicArray['has_credentials']);
        $this->assertSame('AKIA••••MPLE', $publicArray['credentials_masked']['access_key_preview']);
    }

    public function testToArrayCanIncludeSecretsWhenExplicitlyRequested(): void
    {
        $config = new StorageConfiguration();
        $config->setName('s3-prod');
        $config->setProvider(StorageConfiguration::PROVIDER_S3);
        $config->setUnencryptedCredentials(['secret' => 'val']);

        $internalArray = $config->toArray(true);

        $this->assertArrayHasKey('credentials', $internalArray);
        $this->assertSame('val', $internalArray['credentials']['secret']);
    }

    public function testSettingsAccessors(): void
    {
        $config = new StorageConfiguration();
        $config->setSetting('use_path_style_endpoint', true);
        $config->setSetting('store_thumbnails_in_cloud', false);

        $this->assertTrue($config->getSetting('use_path_style_endpoint'));
        $this->assertFalse($config->getSetting('store_thumbnails_in_cloud'));
        $this->assertSame('fallback', $config->getSetting('non_existent', 'fallback'));
    }
}
