<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Tests\Unit;

use Exception;
use PHPUnit\Framework\TestCase;
use Vezolabs\CloudStorageBundle\Security\SecretSanitizer;

class SecretSanitizerTest extends TestCase
{
    public function testSanitizesAwsSecrets(): void
    {
        $raw = 'Error connecting with secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" to host';
        $sanitized = SecretSanitizer::sanitizeString($raw);

        $this->assertStringNotContainsString('wJalrXUtnFEMI', $sanitized);
        $this->assertStringContainsString('[REDACTED]', $sanitized);
    }

    public function testSanitizesAzureConnectionString(): void
    {
        $raw = 'DefaultEndpointsProtocol=https;AccountName=myacc;AccountKey=abc123456789xyz==;EndpointSuffix=core.windows.net';
        $sanitized = SecretSanitizer::sanitizeString($raw);

        $this->assertStringNotContainsString('abc123456789xyz==', $sanitized);
        $this->assertStringContainsString('AccountKey=[REDACTED]', $sanitized);
    }

    public function testSanitizesGooglePrivateKey(): void
    {
        $raw = "Key file contains -----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----";
        $sanitized = SecretSanitizer::sanitizeString($raw);

        $this->assertStringNotContainsString('MIIEvgIBADANBgkqhkiG9w0BAQEFAASC', $sanitized);
        $this->assertStringContainsString('-----BEGIN PRIVATE KEY-----[REDACTED]-----END PRIVATE KEY-----', $sanitized);
    }

    public function testSanitizesArray(): void
    {
        $data = [
            'name' => 'production-storage',
            'provider' => 's3',
            'credentials' => [
                'access_key_id' => 'AKIAIOSFODNN7EXAMPLE',
                'secret_access_key' => 'very_secret_value_12345',
            ],
            'safe_option' => 'enabled',
        ];

        $sanitized = SecretSanitizer::sanitizeArray($data);

        $this->assertSame('[REDACTED]', $sanitized['credentials']);
        $this->assertSame('production-storage', $sanitized['name']);
    }

    public function testSanitizesException(): void
    {
        $e = new Exception('Failed: secret_access_key: "abc123456789012345678901234567890123456"');
        $sanitized = SecretSanitizer::sanitizeException($e);

        $this->assertSame('Exception', $sanitized['class']);
        $this->assertStringNotContainsString('abc1234567890', $sanitized['message']);
        $this->assertStringContainsString('[REDACTED]', $sanitized['message']);
    }
}
