# Technical Architecture: Pimcore 12 Cloud Storage Manager

## Overview

Pimcore 12 uses [Flysystem v3](https://flysystem.thephpleague.com/) through Symfony's `league/flysystem-bundle` to abstract filesystem operations for original asset binaries (`pimcore.asset.storage`), thumbnails (`pimcore.thumbnail.storage`), and version archives (`pimcore.version.storage`).

In Pimcore 12 Core, asset storage is decorated by `Pimcore\Asset\StorageQueue\QueueAwareStorageAdapter`. This wrapper records folder moves and recursive deletions into a database table (`storage_operation_queue`) so that large file trees can be processed asynchronously in background worker queues without stalling interactive HTTP requests.

The **Pimcore Cloud Storage Manager** bundle integrates cleanly into this architecture without modifying any Pimcore core files or vendor libraries.

---

## 1. Extension Point & Dynamic Decoration

Instead of hardcoding a static Flysystem adapter in Symfony YAML, the bundle injects a runtime delegator (`DynamicCloudStorageAdapter`) directly underneath `QueueAwareStorageAdapter`:

```
Pimcore Asset Model ($asset->save(), $asset->getStream())
         │
         ▼
pimcore.asset.storage (League\Flysystem\Filesystem)
         │
         ▼
Pimcore\Asset\StorageQueue\QueueAwareStorageAdapter
         │
         ▼
Vezolabs\CloudStorageBundle\Flysystem\DynamicCloudStorageAdapter (vezolabs.cloud_storage.dynamic_adapter.asset)
         │
         ├─── Active is "s3" ────► AwsS3V3Adapter (Amazon S3 / MinIO / R2)
         ├─── Active is "azure" ─► AzureBlobStorageAdapter (Azure Blob Storage)
         ├─── Active is "gcs" ───► GoogleCloudStorageAdapter (Google Cloud Storage)
         └─── Active is "local" ─► LocalFilesystemAdapter (/public/var/assets)
```

### Compiler Pass Wiring: `CloudStorageAdapterCompilerPass`

During Symfony container compilation:
1. `pimcore.asset.storage_queue.adapter.asset` is inspected.
2. Its inner adapter argument is intercepted.
3. `DynamicCloudStorageAdapter` is registered with the original inner adapter as its fallback.
4. The first argument of `QueueAwareStorageAdapter` is re-pointed to `vezolabs.cloud_storage.dynamic_adapter.asset`.
5. The same wiring is optionally applied to `pimcore.asset.storage_queue.adapter.thumbnail` when cloud thumbnail storage is desired.

---

## 2. In-Memory Caching & Hot Switching

`DynamicCloudStorageAdapter` caches the active `FilesystemAdapter` instance in memory during PHP request or CLI worker execution.

When an administrator activates a new storage profile or rolls back in Pimcore Studio:
1. `StorageConfigurationRepository::setActive($id)` updates the database state atomically.
2. `StorageManagerService::invalidateCache()` triggers registered reset listeners.
3. Subsequent asset operations dynamically resolve and instantiate the new cloud adapter without requiring an application restart or cache clear.

---

## 3. Storage Object Key & Path Consistency

Pimcore's asset model stores file paths hierarchically (e.g. `/catalogs/2026/summer.pdf`).

- **Object Key Strategy**: Cloud object keys map directly to the normalized asset path (`ltrim($path, '/')`), optionally prefixed by the configuration's `path_prefix` (e.g. `assets/catalogs/2026/summer.pdf`).
- **Collision Safety**: Because Pimcore manages parent-child uniqueness at the database level, key collisions are prevented by core invariants.
- **Folder Moves**: Handled transparently by Pimcore's `QueueAwareStorageAdapter`. Prefix rename jobs are enqueued and resolved on demand.

---

## 4. Large-File Streaming

All storage operations implement PHP stream wrappers:
- Reads: `readStream($path)` returns a native PHP resource stream (`$handle`).
- Writes: `writeStream($path, $stream)` passes the resource stream directly to the underlying AWS, Azure, or Google Cloud client.
- Result: Memory consumption remains constant ($O(1)$) regardless of whether an asset is 500 KB or 5 GB.
