<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Security;

use RuntimeException;

class CredentialEncryptor
{
    private const string CIPHER = 'aes-256-gcm';
    private const int TAG_LENGTH = 16;
    private const int IV_LENGTH = 12;

    private string $encryptionKey;

    public function __construct(?string $secretKey = null)
    {
        $rawSecret = $secretKey
            ?? $_ENV['PIMCORE_ENCRYPTION_SECRET']
            ?? $_SERVER['PIMCORE_ENCRYPTION_SECRET']
            ?? $_ENV['APP_SECRET']
            ?? $_SERVER['APP_SECRET']
            ?? 'default-fallback-insecure-key-must-change-in-production-32-bytes!';

        // Derive high-entropy 256-bit key via HKDF
        $this->encryptionKey = hash_hkdf('sha256', $rawSecret, 32, 'pimcore-cloud-storage-credentials');
    }

    /**
     * Encrypts credential data (array or string) using AES-256-GCM.
     */
    public function encrypt(array|string $data): string
    {
        $plaintext = \is_array($data) ? json_encode($data, JSON_THROW_ON_ERROR) : $data;
        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';

        $ciphertext = openssl_encrypt(
            $plaintext,
            self::CIPHER,
            $this->encryptionKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            '',
            self::TAG_LENGTH
        );

        if ($ciphertext === false) {
            throw new RuntimeException('Failed to encrypt credentials using AES-256-GCM.');
        }

        // Output format: base64(iv . tag . ciphertext)
        return base64_encode($iv . $tag . $ciphertext);
    }

    /**
     * Decrypts encrypted credentials.
     */
    public function decrypt(string $payload): array|string
    {
        if ($payload === '') {
            return [];
        }

        $decoded = base64_decode($payload, true);
        if ($decoded === false || \strlen($decoded) < (self::IV_LENGTH + self::TAG_LENGTH)) {
            throw new RuntimeException('Malformed encrypted credential payload.');
        }

        $iv = substr($decoded, 0, self::IV_LENGTH);
        $tag = substr($decoded, self::IV_LENGTH, self::TAG_LENGTH);
        $ciphertext = substr($decoded, self::IV_LENGTH + self::TAG_LENGTH);

        $plaintext = openssl_decrypt(
            $ciphertext,
            self::CIPHER,
            $this->encryptionKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($plaintext === false) {
            throw new RuntimeException('Failed to decrypt credentials. Authentication tag verification failed or key mismatch.');
        }

        $decodedJson = json_decode($plaintext, true);
        if (json_last_error() === JSON_ERROR_NONE && \is_array($decodedJson)) {
            return $decodedJson;
        }

        return $plaintext;
    }

    /**
     * Masks a secret string for safe display (e.g. •••••••• or ••••••••••••abcd).
     */
    public static function maskSecret(?string $secret, int $visibleTail = 4): string
    {
        if ($secret === null || $secret === '') {
            return '';
        }

        $len = \strlen($secret);
        if ($len <= 8) {
            return str_repeat('•', 12);
        }

        return str_repeat('•', 12) . substr($secret, -$visibleTail);
    }
}
