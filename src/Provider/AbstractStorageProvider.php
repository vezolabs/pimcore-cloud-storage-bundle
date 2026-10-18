<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Provider;

use League\Flysystem\Config;
use League\Flysystem\FilesystemAdapter;
use League\Flysystem\UnableToReadFile;
use League\Flysystem\UnableToWriteFile;
use Throwable;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Security\SecretSanitizer;

abstract class AbstractStorageProvider implements StorageProviderInterface
{
    /**
     * Default probe implementation using Flysystem operations.
     */
    public function testConnection(StorageConfiguration $config): array
    {
        $validationErrors = $this->validateConfiguration($config);
        if (!empty($validationErrors)) {
            return [
                'success' => false,
                'message' => 'Configuration is incomplete or invalid.',
                'details' => [
                    'validation_errors' => $validationErrors,
                ],
                'latency_ms' => 0.0,
            ];
        }

        $startTime = microtime(true);
        $steps = [];
        $adapter = null;
        $probeFileName = '.pimcore_probe_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.tmp';
        $probePayload = 'Pimcore Cloud Storage Probe verification - ' . date('c');
        $probeWritten = false;

        try {
            // Step 1: Initialize adapter / client
            $stepStart = microtime(true);
            $adapter = $this->createAdapter($config);
            $steps['initialize_client'] = [
                'status' => 'passed',
                'description' => 'Storage client initialized successfully',
                'duration_ms' => round((microtime(true) - $stepStart) * 1000, 2),
            ];

            // Step 2: Write test probe object (Verify Write / Upload permission)
            $stepStart = microtime(true);
            $adapter->write($probeFileName, $probePayload, new Config());
            $probeWritten = true;
            $steps['write_permission'] = [
                'status' => 'passed',
                'description' => 'Successfully uploaded test probe object',
                'duration_ms' => round((microtime(true) - $stepStart) * 1000, 2),
            ];

            // Step 3: Check existence and Read test probe object (Verify Read permission)
            $stepStart = microtime(true);
            $exists = $adapter->fileExists($probeFileName);
            if (!$exists) {
                throw new UnableToReadFile("Test probe file '{$probeFileName}' was written but could not be located.");
            }
            $readBack = $adapter->read($probeFileName);
            if ($readBack !== $probePayload) {
                throw new UnableToReadFile("Test probe payload mismatch upon read verification.");
            }
            $steps['read_permission'] = [
                'status' => 'passed',
                'description' => 'Successfully read back and verified test probe object',
                'duration_ms' => round((microtime(true) - $stepStart) * 1000, 2),
            ];

            // Step 4: Delete test probe object (Verify Delete permission)
            $stepStart = microtime(true);
            $adapter->delete($probeFileName);
            $probeWritten = false; // Successfully cleaned up
            $steps['delete_permission'] = [
                'status' => 'passed',
                'description' => 'Successfully deleted test probe object',
                'duration_ms' => round((microtime(true) - $stepStart) * 1000, 2),
            ];

            $totalDuration = round((microtime(true) - $startTime) * 1000, 2);

            return [
                'success' => true,
                'message' => 'Connection successful! Read, write, and delete permissions verified.',
                'details' => $steps,
                'latency_ms' => $totalDuration,
            ];
        } catch (Throwable $e) {
            $totalDuration = round((microtime(true) - $startTime) * 1000, 2);
            $friendlyMessage = $this->classifyErrorMessage($e);

            return [
                'success' => false,
                'message' => $friendlyMessage,
                'details' => array_merge($steps, [
                    'failure' => [
                        'class' => (new \ReflectionClass($e))->getShortName(),
                        'sanitized_error' => SecretSanitizer::sanitizeString($e->getMessage()),
                    ],
                ]),
                'latency_ms' => $totalDuration,
            ];
        } finally {
            // Guaranteed cleanup
            if ($probeWritten && $adapter instanceof FilesystemAdapter) {
                try {
                    $adapter->delete($probeFileName);
                } catch (Throwable) {
                    // Suppress cleanup error to not overwrite primary test outcome
                }
            }
        }
    }

    /**
     * Translates low-level cloud SDK exceptions into human-friendly messages without technical jargon.
     */
    protected function classifyErrorMessage(Throwable $e): string
    {
        $msg = strtolower($e->getMessage());

        if (str_contains($msg, 'accessdenied') || str_contains($msg, 'forbidden') || str_contains($msg, '403') || str_contains($msg, 'signaturedoesnotmatch') || str_contains($msg, 'invalidaccesskeyid') || str_contains($msg, 'unauthorized') || str_contains($msg, 'authenticationfailed')) {
            return 'Authentication failed or credentials are invalid. Please check your credentials or IAM permissions.';
        }

        if (str_contains($msg, 'nosuchbucket') || str_contains($msg, 'containernotfound') || str_contains($msg, 'not found') || str_contains($msg, '404')) {
            return 'The specified bucket or container does not exist. Please check the name and ensure it is created in your cloud console.';
        }

        if (str_contains($msg, 'could not resolve host') || str_contains($msg, 'connection refused') || str_contains($msg, 'network') || str_contains($msg, 'timed out') || str_contains($msg, 'curl error 28')) {
            return 'Network connection failed. Unable to reach the storage service endpoint.';
        }

        if (str_contains($msg, 'ssl') || str_contains($msg, 'certificate')) {
            return 'SSL/TLS connection error. Please verify endpoint certificates and custom endpoint URLs.';
        }

        return 'Connection test failed: ' . SecretSanitizer::sanitizeString($e->getMessage());
    }

    public function getPublicUrl(StorageConfiguration $config, string $path): ?string
    {
        $prefix = $config->getSetting('public_url_prefix');
        if ($prefix) {
            return rtrim((string)$prefix, '/') . '/' . ltrim($path, '/');
        }

        return null;
    }
}
