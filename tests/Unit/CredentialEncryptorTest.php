<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Tests\Unit;

use PHPUnit\Framework\TestCase;
use RuntimeException;
use Vezolabs\CloudStorageBundle\Security\CredentialEncryptor;

class CredentialEncryptorTest extends TestCase
{
    private CredentialEncryptor $encryptor;

    protected function setUp(): void
    {
        $this->encryptor = new CredentialEncryptor('test-secret-key-32-bytes-long-key!!');
    }

    public function testEncryptAndDecryptArray(): void
    {
        $payload = [
            'access_key_id' => 'AKIAIOSFODNN7EXAMPLE',
            'secret_access_key' => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        ];

        $encrypted = $this->encryptor->encrypt($payload);
        $this->assertNotSame($payload, $encrypted);
        $this->assertNotEmpty($encrypted);

        $decrypted = $this->encryptor->decrypt($encrypted);
        $this->assertSame($payload, $decrypted);
    }

    public function testEncryptAndDecryptString(): void
    {
        $string = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=abc123==;EndpointSuffix=core.windows.net';
        $encrypted = $this->encryptor->encrypt($string);
        $decrypted = $this->encryptor->decrypt($encrypted);

        $this->assertSame($string, $decrypted);
    }

    public function testTamperedPayloadFails(): void
    {
        $payload = ['key' => 'secret_value'];
        $encrypted = $this->encryptor->encrypt($payload);

        // Tamper with the ciphertext
        $raw = base64_decode($encrypted);
        $tamperedRaw = substr($raw, 0, -2) . 'XX';
        $tampered = base64_encode($tamperedRaw);

        $this->expectException(RuntimeException::class);
        $this->encryptor->decrypt($tampered);
    }

    public function testMaskSecret(): void
    {
        $this->assertSame('••••••••••••', CredentialEncryptor::maskSecret('short'));
        $this->assertSame('••••••••••••6789', CredentialEncryptor::maskSecret('my-super-secret-key-123456789'));
        $this->assertSame('', CredentialEncryptor::maskSecret(''));
        $this->assertSame('', CredentialEncryptor::maskSecret(null));
    }
}
