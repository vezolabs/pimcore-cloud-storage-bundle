<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Provider;

use League\Flysystem\FilesystemAdapter;
use League\Flysystem\Local\LocalFilesystemAdapter;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;

class LocalStorageProvider extends AbstractStorageProvider
{
    public function __construct(private readonly string $projectDir)
    {
    }

    public function getKey(): string
    {
        return StorageConfiguration::PROVIDER_LOCAL;
    }

    public function getDisplayName(): string
    {
        return 'Local Filesystem Storage';
    }

    public function validateConfiguration(StorageConfiguration $config): array
    {
        return [];
    }

    public function createAdapter(StorageConfiguration $config): FilesystemAdapter
    {
        $dir = $config->getSetting('directory') ?? ($this->projectDir . '/public/var/assets');

        return new LocalFilesystemAdapter($dir);
    }

    public function getPublicUrl(StorageConfiguration $config, string $path): ?string
    {
        return null;
    }
}
