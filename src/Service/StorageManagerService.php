<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Service;

use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;

class StorageManagerService
{
    private ?StorageConfiguration $cachedActiveConfig = null;
    private bool $isLoaded = false;
    /** @var callable[] */
    private array $resetListeners = [];

    public function __construct(private readonly StorageConfigurationRepository $repository)
    {
    }

    public function addResetListener(callable $listener): void
    {
        $this->resetListeners[] = $listener;
    }

    public function getActiveConfiguration(): ?StorageConfiguration
    {
        if ($this->isLoaded) {
            return $this->cachedActiveConfig;
        }

        try {
            $this->cachedActiveConfig = $this->repository->findActive();
            $this->isLoaded = true;
        } catch (\Throwable) {
            // If table doesn't exist yet (e.g. before install), return null
            $this->cachedActiveConfig = null;
            $this->isLoaded = true;
        }

        return $this->cachedActiveConfig;
    }

    public function activate(int $id, string $user = 'system'): StorageConfiguration
    {
        $this->repository->setActive($id, $user);
        $this->invalidateCache();

        $config = $this->repository->findById($id);
        $this->cachedActiveConfig = $config;
        $this->isLoaded = true;

        return $config;
    }

    public function invalidateCache(): void
    {
        $this->cachedActiveConfig = null;
        $this->isLoaded = false;

        foreach ($this->resetListeners as $listener) {
            $listener();
        }
    }
}
