<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Provider\AzureBlobStorageProvider;

class AzureBlobStorageProviderTest extends TestCase
{
    private AzureBlobStorageProvider $provider;

    protected function setUp(): void
    {
        $this->provider = new AzureBlobStorageProvider();
    }

    public function testValidatesEmptyContainer(): void
    {
        $config = new StorageConfiguration();
        $config->setName('azure-test');
        $config->setProvider(StorageConfiguration::PROVIDER_AZURE);
        $config->setBucketOrContainer('');

        $errors = $this->provider->validateConfiguration($config);
        $this->assertArrayHasKey('bucket_or_container', $errors);
    }

    public function testValidatesMissingConnectionString(): void
    {
        $config = new StorageConfiguration();
        $config->setName('azure-test');
        $config->setProvider(StorageConfiguration::PROVIDER_AZURE);
        $config->setBucketOrContainer('mycontainer');
        $config->setAuthType(StorageConfiguration::AUTH_AZURE_CONNECTION_STRING);
        $config->setUnencryptedCredentials([]);

        $errors = $this->provider->validateConfiguration($config);
        $this->assertArrayHasKey('connection_string', $errors);
    }

    public function testValidatesMissingAccountKeyWhenUsingAccountKeyAuth(): void
    {
        $config = new StorageConfiguration();
        $config->setName('azure-test');
        $config->setProvider(StorageConfiguration::PROVIDER_AZURE);
        $config->setBucketOrContainer('mycontainer');
        $config->setAuthType(StorageConfiguration::AUTH_AZURE_ACCOUNT_KEY);
        $config->setRegionOrProject('mystorageaccount');
        $config->setUnencryptedCredentials([]);

        $errors = $this->provider->validateConfiguration($config);
        $this->assertArrayHasKey('account_key', $errors);
    }

    public function testPublicUrlGeneration(): void
    {
        $config = new StorageConfiguration();
        $config->setName('azure-test');
        $config->setProvider(StorageConfiguration::PROVIDER_AZURE);
        $config->setBucketOrContainer('pimcore-assets');
        $config->setRegionOrProject('mycorpstorage');
        $config->setPathPrefix('media');

        $url = $this->provider->getPublicUrl($config, 'banner.png');
        $this->assertSame('https://mycorpstorage.blob.core.windows.net/pimcore-assets/media/banner.png', $url);
    }
}
