# Asset Migration Guide: Local to Cloud Storage

When adopting cloud storage for an existing Pimcore installation, asset files currently residing on the local disk (`/public/var/assets`) need to be copied to the new cloud bucket.

---

## 1. Migration Workflow Principles

1. **Non-Destructive**: The migration process **copies** assets from source to destination. It **never deletes** source files.
2. **Resumable**: If a migration is interrupted or run multiple times, files that already exist on the target storage with matching file size are skipped automatically.
3. **Checksum Verification**: Checksums are computed and validated to guarantee binary integrity.
4. **Zero Downtime**: Pimcore continues serving reads and handling operations while background copying takes place.

---

## 2. Using the Studio UI Migration Assistant

1. Navigate to **Settings -> Cloud Storage** in Pimcore Studio.
2. Click **Migration Assistant** in the top header.
3. Select your **Source Storage** (defaults to currently active backend) and **Destination Storage**.
4. Click **Run Preflight Scan**:
   - The system inspects the source files, calculates total byte size, checks target container reachability, and provides an estimated completion time.
5. (Optional) Enable **Dry-Run Simulation Only** to test the migration without writing data.
6. Click **Start Migration**:
   - Monitor real-time progress, file counts, and error reports directly from the interface.
7. Once migration completes with 0 errors, navigate to the **Storage Profiles** tab and click **Activate** on the target cloud configuration.

---

## 3. Using the CLI Migration Command

For large installations (tens of thousands of assets or gigabytes of media), running the migration via CLI or background worker is recommended:

```bash
# 1. Run a dry-run preflight validation
bin/console pimcore:cloud-storage:migrate --target=s3-production --dry-run

# 2. Run the actual migration
bin/console pimcore:cloud-storage:migrate --target=s3-production

# 3. Activate the new storage backend
bin/console pimcore:cloud-storage:activate s3-production
```

---

## 4. Rollback Procedure

If a cloud provider experiences an outage or misconfiguration after activation:

1. In Pimcore Studio: Go to **Settings -> Cloud Storage**, find the previous profile (e.g. `Local Application Filesystem`), and click **Activate**.
2. Or via CLI:
   ```bash
   bin/console pimcore:cloud-storage:activate local-default
   ```
Pimcore will immediately revert to the previous storage backend without requiring a server reboot.
