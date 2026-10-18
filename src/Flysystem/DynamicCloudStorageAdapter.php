<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Flysystem;

use DateTimeInterface;
use League\Flysystem\CalculateChecksumFromStream;
use League\Flysystem\ChecksumProvider;
use League\Flysystem\Config;
use League\Flysystem\FileAttributes;
use League\Flysystem\FilesystemAdapter;
use League\Flysystem\UnableToGeneratePublicUrl;
use League\Flysystem\UnableToGenerateTemporaryUrl;
use League\Flysystem\UrlGeneration\PublicUrlGenerator;
use League\Flysystem\UrlGeneration\TemporaryUrlGenerator;
use Psr\Log\LoggerInterface;
use Throwable;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Service\StorageManagerService;

final class DynamicCloudStorageAdapter implements FilesystemAdapter, PublicUrlGenerator, TemporaryUrlGenerator, ChecksumProvider
{
    use CalculateChecksumFromStream;

    private ?FilesystemAdapter $activeAdapter = null;
    private ?string $activeConfigName = null;

    public function __construct(
        private readonly FilesystemAdapter $localFallback,
        private readonly StorageManagerService $storageManager,
        private readonly CloudStorageAdapterFactory $adapterFactory,
        private readonly LoggerInterface $logger,
        private readonly string $storageType = 'asset'
    ) {
    }

    public function resetAdapterCache(): void
    {
        $this->activeAdapter = null;
        $this->activeConfigName = null;
    }

    public function getResolvedAdapter(): FilesystemAdapter
    {
        if ($this->activeAdapter !== null) {
            return $this->activeAdapter;
        }

        try {
            $activeConfig = $this->storageManager->getActiveConfiguration();

            if ($activeConfig === null || $activeConfig->getProvider() === StorageConfiguration::PROVIDER_LOCAL) {
                $this->activeAdapter = $this->localFallback;
                $this->activeConfigName = 'local';

                return $this->activeAdapter;
            }

            // For thumbnails: only use cloud adapter if store_thumbnails_in_cloud is enabled
            if ($this->storageType === 'thumbnail') {
                $storeThumbnailsInCloud = (bool)$activeConfig->getSetting('store_thumbnails_in_cloud', false);
                if (!$storeThumbnailsInCloud) {
                    $this->activeAdapter = $this->localFallback;
                    $this->activeConfigName = 'local';

                    return $this->activeAdapter;
                }
            }

            $this->activeAdapter = $this->adapterFactory->createAdapter($activeConfig);
            $this->activeConfigName = $activeConfig->getName();

            return $this->activeAdapter;
        } catch (Throwable $e) {
            $this->logger->critical(sprintf(
                '[Pimcore Cloud Storage] Failed to initialize active cloud storage adapter for %s: %s. Falling back to local storage.',
                $this->storageType,
                $e->getMessage()
            ));

            $this->activeAdapter = $this->localFallback;
            $this->activeConfigName = 'local_fallback';

            return $this->activeAdapter;
        }
    }

    public function fileExists(string $path): bool
    {
        return $this->getResolvedAdapter()->fileExists($path);
    }

    public function directoryExists(string $path): bool
    {
        return $this->getResolvedAdapter()->directoryExists($path);
    }

    public function write(string $path, string $contents, Config $config): void
    {
        $this->getResolvedAdapter()->write($path, $contents, $config);
    }

    public function writeStream(string $path, $contents, Config $config): void
    {
        $this->getResolvedAdapter()->writeStream($path, $contents, $config);
    }

    public function read(string $path): string
    {
        return $this->getResolvedAdapter()->read($path);
    }

    public function readStream(string $path)
    {
        return $this->getResolvedAdapter()->readStream($path);
    }

    public function delete(string $path): void
    {
        $this->getResolvedAdapter()->delete($path);
    }

    public function deleteDirectory(string $prefix): void
    {
        $this->getResolvedAdapter()->deleteDirectory($prefix);
    }

    public function createDirectory(string $path, Config $config): void
    {
        $this->getResolvedAdapter()->createDirectory($path, $config);
    }

    public function setVisibility(string $path, string $visibility): void
    {
        $this->getResolvedAdapter()->setVisibility($path, $visibility);
    }

    public function visibility(string $path): FileAttributes
    {
        return $this->getResolvedAdapter()->visibility($path);
    }

    public function mimeType(string $path): FileAttributes
    {
        return $this->getResolvedAdapter()->mimeType($path);
    }

    public function lastModified(string $path): FileAttributes
    {
        return $this->getResolvedAdapter()->lastModified($path);
    }

    public function fileSize(string $path): FileAttributes
    {
        return $this->getResolvedAdapter()->fileSize($path);
    }

    public function listContents(string $path, bool $deep): iterable
    {
        return $this->getResolvedAdapter()->listContents($path, $deep);
    }

    public function move(string $source, string $destination, Config $config): void
    {
        $this->getResolvedAdapter()->move($source, $destination, $config);
    }

    public function copy(string $source, string $destination, Config $config): void
    {
        $this->getResolvedAdapter()->copy($source, $destination, $config);
    }

    public function publicUrl(string $path, Config $config): string
    {
        $adapter = $this->getResolvedAdapter();
        if ($adapter instanceof PublicUrlGenerator) {
            return $adapter->publicUrl($path, $config);
        }

        $activeConfig = $this->storageManager->getActiveConfiguration();
        if ($activeConfig) {
            $prefix = $activeConfig->getSetting('public_url_prefix');
            if ($prefix) {
                return rtrim((string)$prefix, '/') . '/' . ltrim($path, '/');
            }
        }

        throw UnableToGeneratePublicUrl::noGeneratorConfigured($path);
    }

    public function temporaryUrl(string $path, DateTimeInterface $expiresAt, Config $config): string
    {
        $adapter = $this->getResolvedAdapter();
        if ($adapter instanceof TemporaryUrlGenerator) {
            return $adapter->temporaryUrl($path, $expiresAt, $config);
        }

        throw UnableToGenerateTemporaryUrl::noGeneratorConfigured($path);
    }

    public function checksum(string $path, Config $config): string
    {
        $adapter = $this->getResolvedAdapter();
        if ($adapter instanceof ChecksumProvider) {
            return $adapter->checksum($path, $config);
        }

        return $this->calculateChecksumFromStream($path, $config);
    }

    public function getActiveConfigName(): ?string
    {
        return $this->activeConfigName;
    }
}
