<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Service;

use InvalidArgumentException;
use Throwable;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Provider\StorageProviderRegistry;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;
use Vezolabs\CloudStorageBundle\Security\SecretSanitizer;

class ConnectionTester
{
    public function __construct(
        private readonly StorageProviderRegistry $providerRegistry,
        private readonly StorageConfigurationRepository $repository
    ) {
    }

    public function testById(int $id, string $user = 'system'): array
    {
        $config = $this->repository->findById($id);
        if ($config === null) {
            throw new InvalidArgumentException("Configuration with ID {$id} not found.");
        }

        $result = $this->testConfiguration($config);

        // Update test status in database
        $config->setLastTestedAt(new \DateTime());
        $config->setLastTestStatus($result['success'] ? StorageConfiguration::TEST_STATUS_SUCCESS : StorageConfiguration::TEST_STATUS_FAILED);
        $config->setLastTestMessage($result['message']);
        $this->repository->save($config, $user);

        return $result;
    }

    public function testConfiguration(StorageConfiguration $config): array
    {
        try {
            $provider = $this->providerRegistry->get($config->getProvider());

            return $provider->testConnection($config);
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Connection test failed: ' . SecretSanitizer::sanitizeString($e->getMessage()),
                'details' => [
                    'error' => SecretSanitizer::sanitizeException($e),
                ],
                'latency_ms' => 0.0,
            ];
        }
    }
}
