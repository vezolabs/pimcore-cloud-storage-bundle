<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Provider;

use League\Flysystem\FilesystemAdapter;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;

interface StorageProviderInterface
{
    /**
     * Unique provider identifier (e.g., 's3', 'azure', 'gcs', 'local').
     */
    public function getKey(): string;

    /**
     * Human-friendly provider name (e.g. 'Amazon S3 & S3-Compatible').
     */
    public function getDisplayName(): string;

    /**
     * Validates configuration attributes before saving or connecting.
     *
     * @return array<string, string> Key-value pairs of field => error message. Empty array if valid.
     */
    public function validateConfiguration(StorageConfiguration $config): array;

    /**
     * Creates a configured Flysystem adapter instance for this provider.
     */
    public function createAdapter(StorageConfiguration $config): FilesystemAdapter;

    /**
     * Performs an end-to-end connection and permission probe test against the live cloud service:
     * 1. Checks bucket/container existence and accessibility.
     * 2. Writes a temporary test probe object.
     * 3. Reads back the probe object to verify read integrity.
     * 4. Deletes the probe object (safely cleaned up even if test fails).
     *
     * @return array Detailed test report containing:
     *               - success: bool
     *               - message: string (clear human message)
     *               - details: array of step-by-step results
     *               - latency_ms: float
     */
    public function testConnection(StorageConfiguration $config): array;

    /**
     * Generates a public URL or CDN URL for an asset if configured.
     */
    public function getPublicUrl(StorageConfiguration $config, string $path): ?string;
}
