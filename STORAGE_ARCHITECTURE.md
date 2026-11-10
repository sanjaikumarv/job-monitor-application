# Storage Architecture & Multi-Instance Deployment Guide

## 1. Local JSON Storage Abstraction
The system implements a dedicated storage service interface (`IStorageService`) defined in `src/modules/storage/storage.interface.ts`.

### Directory Layout
```
storage/
├── configurations/
│   └── folders.json          # Monitored directory configurations
├── jobs/
│   └── jobs.json             # Deduped job opportunities & schema mappings
├── processing/
│   └── processing-history.json # CSV parsing audit log with line errors & SHA-256
├── notifications/
│   └── notification-history.json # Nodemailer & FCM delivery log with retry history
└── devices/
    └── devices.json          # Registered FCM Web & Mobile device tokens
```

## 2. Concurrency Safety & Atomic Writes
To prevent file corruption during sudden power losses or concurrent requests:
1. **Atomic Swaps**: Data is written to a unique temporary file (`${target}.tmp.${timestamp}.${random}`). Only after the OS confirms full flush to disk, `fs.promises.rename` performs an atomic POSIX replace of the target file.
2. **In-Memory Mutex Chains**: A promise write-lock per file path (`Map<string, Promise<void>>`) queues concurrent operations sequentially, eliminating file-locking collisions on Windows and Linux.
3. **Batch Writes**: Bulk CSV operations ingest all records and perform a single atomic commit instead of rewrites per line.

## 3. Multi-Instance Limitations & Migration Path
When running multiple container replicas (e.g. Kubernetes, AWS ECS, Docker Swarm):
* **Filesystem Event Race Conditions**: Chokidar relies on local kernel filesystem notifications (`ReadDirectoryChangesW` on Windows, `inotify` on Linux). If multiple instances watch a shared network volume (NFS/SMB/EFS), race conditions occur where multiple replicas parse the same CSV and emit duplicate queue jobs.
* **Storage Lock Boundary**: The in-memory mutex only serializes writes within a single Node.js process. Two separate container instances writing to the same `jobs.json` over a shared mount could overwrite each other's state.

### Production Solution:
1. **Single Watcher Leader Election**: Run Chokidar on a dedicated single replica or use Redis-based distributed locking (`redlock`) so only one leader watches filesystem paths.
2. **Database Migration**:
   * Replace `JsonStorageService` with a `PostgresStorageService` (TypeORM/Prisma) or `MongoStorageService` (Mongoose).
   * Because business services depend solely on `IStorageService` and repository interfaces, swapping storage engines requires zero changes to `CsvProcessingService`, `FoldersService`, or `NotificationsService`.

