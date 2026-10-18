<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Security;

use Throwable;

class SecretSanitizer
{
    private const array PATTERNS = [
        // AWS Secret Key: 40 chars base64-like
        '/(?i)(secret_access_key|aws_secret_access_key|secretkey|secret)\s*[:=]\s*["\']?([a-zA-Z0-9\/+=]{35,45})["\']?/' => '$1=[REDACTED]',
        // AWS Access Key ID
        '/(AKIA[0-9A-Z]{16})/' => '$1', // Usually public ID, but let's allow or partially mask if needed
        // Azure AccountKey / Connection string
        '/(?i)(AccountKey)=([^;\'"]+)/' => '$1=[REDACTED]',
        '/(?i)(SharedAccessSignature|sig)=([^;\'"&\s]+)/' => '$1=[REDACTED]',
        // Google Private Key
        '/-----BEGIN PRIVATE KEY-----(?:[^-]+)-----END PRIVATE KEY-----/s' => '-----BEGIN PRIVATE KEY-----[REDACTED]-----END PRIVATE KEY-----',
        // Generic password / client_secret
        '/(?i)(password|client_secret|api_key|token)\s*[:=]\s*["\']?([^"\'\s,]{6,})["\']?/' => '$1="[REDACTED]"',
    ];

    /**
     * Sanitizes a string, stripping secrets.
     */
    public static function sanitizeString(string $input): string
    {
        $sanitized = $input;
        foreach (self::PATTERNS as $pattern => $replacement) {
            $sanitized = (string)preg_replace($pattern, $replacement, $sanitized);
        }

        return $sanitized;
    }

    /**
     * Sanitizes an exception message and stack trace.
     */
    public static function sanitizeException(Throwable $e): array
    {
        return [
            'class' => (new \ReflectionClass($e))->getShortName(),
            'message' => self::sanitizeString($e->getMessage()),
            'code' => $e->getCode(),
        ];
    }

    /**
     * Recursively sanitizes an array.
     */
    public static function sanitizeArray(array $data): array
    {
        $result = [];
        $sensitiveKeys = [
            'secret_access_key', 'access_key_secret', 'secret', 'password',
            'connection_string', 'account_key', 'private_key', 'service_account_json',
            'key_file', 'client_secret', 'token', 'credentials',
        ];

        foreach ($data as $k => $v) {
            if (\is_string($k) && \in_array(strtolower($k), $sensitiveKeys, true)) {
                $result[$k] = '[REDACTED]';
            } elseif (\is_array($v)) {
                $result[$k] = self::sanitizeArray($v);
            } elseif (\is_string($v)) {
                $result[$k] = self::sanitizeString($v);
            } else {
                $result[$k] = $v;
            }
        }

        return $result;
    }
}
