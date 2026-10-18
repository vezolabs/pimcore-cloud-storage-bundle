# Security & Credential Management Architecture

Security and data protection are fundamental to the **Pimcore Cloud Storage Manager** bundle.

---

## 1. Cryptographic Storage of Credentials

Cloud credentials (AWS Secret Access Keys, Azure Connection Strings, GCP Service Account JSON keys) are encrypted before being written to the database.

- **Algorithm**: `AES-256-GCM` (Galois/Counter Mode) authenticated encryption.
- **Key Derivation**: HKDF-SHA256 (RFC 5869) derives a dedicated 256-bit encryption key from `PIMCORE_ENCRYPTION_SECRET` (configured in `.env.local`).
- **Initialization Vector (IV)**: A unique, cryptographically secure 12-byte random IV (`random_bytes(12)`) is generated for every encryption operation.
- **Integrity Tag**: A 16-byte authentication tag guarantees detection of any ciphertext tampering.

---

## 2. API Response Security & Secret Masking

- Sensitive credentials are **never returned to the browser** in any REST API response.
- When an administrator views an existing configuration in Pimcore Studio, secret fields return masked representations (e.g. `AKIA••••MPLE` or `••••••••••••`).
- Updates allow editing configuration metadata (bucket name, prefix, custom domains) without exposing or re-entering existing secret keys.

---

## 3. Log & Exception Sanitization

The `SecretSanitizer` utility automatically filters sensitive patterns from:
- Application log messages
- Exception stack traces
- Diagnostic reports

Patterns scrubbed include:
- AWS Access Key IDs and Secret Access Keys
- Azure `AccountKey=...` and Shared Access Signatures (`sig=...`)
- Google Cloud RSA Private Keys (`-----BEGIN PRIVATE KEY-----`)
- Passwords and bearer tokens

---

## 4. Role-Based Permissions in Pimcore Studio

Two granular permissions are registered in Pimcore's permission system:

| Permission Key | Description | Category |
|---|---|---|
| `PIMCORE_CLOUD_STORAGE_VIEW` | View the dashboard, connection status, diagnostics, and storage profiles. | `settings` |
| `PIMCORE_CLOUD_STORAGE_MANAGE` | Create/edit profiles, test connections, activate backends, and run migrations. | `settings` |

Pimcore Super Administrators (`admin`) have full management access by default. Non-admin users must be explicitly granted permissions in Pimcore User Management.
