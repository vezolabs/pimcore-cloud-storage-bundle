# Troubleshooting & Diagnostics Guide

## Common Issues & Resolutions

### 1. "Authentication failed or credentials are invalid"
- **Cause**: The Access Key ID, Secret Key, or Azure Connection String is mistyped, expired, or deleted in the cloud console.
- **Resolution**:
  - Test the connection using the **Test Connection** button in the profile editor.
  - For AWS S3: verify the IAM user is active and has permissions attached.
  - For Azure: verify the Storage Account name matches the connection string.
  - For Google Cloud: verify the Service Account JSON key is complete and not truncated.

---

### 2. "The specified bucket or container does not exist"
- **Cause**: The bucket/container has not been created in the cloud provider console, or the name has a typo.
- **Resolution**:
  - Cloud storage buckets and containers must exist prior to activation.
  - Create the bucket in your AWS, Azure, or GCP console before entering it in Pimcore Studio.

---

### 3. "Network connection failed / Connection timed out"
- **Cause**: Your Pimcore server cannot reach the cloud endpoint due to firewall rules, egress restrictions, or DNS issues.
- **Resolution**:
  - Check firewall egress ports: TCP 443 (HTTPS).
  - If using MinIO or private S3: verify the custom endpoint URL is reachable from the Pimcore web server container.

---

### 4. Memory Limit during Large Migrations
- **Cause**: Default CLI memory limit is too low on the host machine.
- **Resolution**:
  - While `MigrationOrchestrator` uses constant-memory streaming ($O(1)$), Pimcore's kernel requires sufficient memory to boot.
  - Run the CLI command with 512 MB memory limit:
    ```bash
    php -d memory_limit=512M bin/console pimcore:cloud-storage:migrate --target=s3-production
    ```

---

### 5. Private Buckets & Image Previews
- **Cause**: Cloud bucket has no public read access, causing asset thumbnails or previews to fail when accessed directly via cloud URLs.
- **Resolution**:
  - Keep thumbnail storage on local cache (configured in Wizard Step 4: *Store Thumbnails in Cloud = OFF*). Pimcore will generate and serve thumbnails directly from the web server.
  - For original assets, use the built-in streaming endpoint `/cloud-asset{uri}` or configure a CDN with pre-signed URLs.
