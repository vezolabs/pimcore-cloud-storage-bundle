<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Flysystem;

use League\Flysystem\FilesystemAdapter;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Provider\StorageProviderRegistry;

class CloudStorageAdapterFactory
{
    public function __construct(private readonly StorageProviderRegistry $providerRegistry)
    {
    }

    public function createAdapter(StorageConfiguration $config): FilesystemAdapter
    {
        $provider = $this->providerRegistry->get($config->getProvider());

        return $provider->createAdapter($config);
    }
}
