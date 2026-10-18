<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Provider;

use InvalidArgumentException;

class StorageProviderRegistry
{
    /**
     * @var array<string, StorageProviderInterface>
     */
    private array $providers = [];

    /**
     * @param iterable<StorageProviderInterface> $providers
     */
    public function __construct(iterable $providers = [])
    {
        foreach ($providers as $provider) {
            $this->registerProvider($provider);
        }
    }

    public function registerProvider(StorageProviderInterface $provider): void
    {
        $this->providers[$provider->getKey()] = $provider;
    }

    public function get(string $key): StorageProviderInterface
    {
        if (!isset($this->providers[$key])) {
            throw new InvalidArgumentException("Storage provider '{$key}' is not registered. Available: " . implode(', ', array_keys($this->providers)));
        }

        return $this->providers[$key];
    }

    public function has(string $key): bool
    {
        return isset($this->providers[$key]);
    }

    /**
     * @return array<string, StorageProviderInterface>
     */
    public function all(): array
    {
        return $this->providers;
    }
}
