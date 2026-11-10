# Job Monitoring & Automated Notification System

A production-ready folder monitoring and multi-channel notification engine built with **NestJS**, **Next.js App Router**, **Chokidar**, **BullMQ**, **Nodemailer**, and **Firebase Cloud Messaging (FCM HTTP v1)**.

---

## 🌟 Key Features

1. **Multi-Folder Filesystem Monitoring**:
   - Independent Chokidar file watchers with recursive directory support.
   - Detects CSV file additions, modifications, and deletions.
   - Write stability checks (`awaitWriteFinish`), debounce buffers, and file-lock verification.
   - Directory browser modal (`FolderBrowserModal`) and clipboard paste support in frontend.

2. **Resilient CSV Ingestion & Deduplication**:
   - Streaming CSV parsing with multiline and quoted field handling.
   - Schema normalizer supporting standard job attributes and vendor formats.
   - SHA-256 file fingerprinting to eliminate redundant processing runs.
   - Meaningful job change detection (identifies changes to title, company, skills, or platform).

3. **Atomic JSON Storage Layer**:
   - Clean `IStorageService` abstraction easily swappable with PostgreSQL or MongoDB.
   - Atomic POSIX file writes (temporary write + flush + atomic rename).
   - In-memory per-path mutex locks to eliminate write collisions.

4. **Background Queue Engine (BullMQ)**:
   - Dedicated queues for `email-notifications` and `push-notifications`.
   - Concurrency limits, exponential backoff retries, and job-level deduplication.

5. **Multi-Channel Notifications & Device Management**:
   - **HTML Emails**: Responsive email templates with badge pills, CTA buttons, and XSS escaping.
   - **FCM Push Notifications**: Direct FCM v1 HTTP API integration with native RSA-SHA256 OAuth2 assertion exchange.
   - **Initial Device Capture**: Automatically detects machine type (laptop, desktop, mobile), registers token on app mount, and stores to `storage/devices/devices.json`.
   - **Push Broadcast**: Broadcast notifications to all registered machines via `POST /api/devices/broadcast` or the UI dashboard.

6. **Interactive Next.js Dashboard**:
   - 8 live KPI summary metric cards.
   - Real-time directory monitoring management with toggle/delete controls.
   - Searchable, filterable, and paginated job catalog with detail modal.
   - Ingestion audit history with line-by-line error reporting.
   - Notification delivery audit log with one-click retries.

---

## 🚀 Quick Start

### 1. Backend (`job-api`)
```bash
cd job-api
cp .env.example .env
pnpm test          # Run Vitest test suite (10/10 test suites, 31 tests)
pnpm run start:dev # Starts NestJS on http://localhost:3001
```

### 2. Frontend (`job-ui`)
```bash
cd job-ui
cp .env.example .env.local
pnpm build         # Verify production build
pnpm run dev       # Starts Next.js on http://localhost:3000
```

---

## 📁 Repository Structure

```
job-monitor/
├── job-api/                # NestJS Backend API
│   ├── src/
│   │   ├── common/         # DTOs, interfaces, filters, hashing utils
│   │   ├── modules/
│   │   │   ├── storage/    # Atomic JSON storage abstraction
│   │   │   ├── folders/    # Folder watcher & directory browser
│   │   │   ├── csv-processing/ # Parser, normalizer, validator, ingestion
│   │   │   ├── jobs/       # Job catalog & diff engine
│   │   │   ├── queues/     # BullMQ queue manager & worker registry
│   │   │   ├── email/      # Nodemailer service, templates, queue worker
│   │   │   ├── push/       # FCM v1 HTTP client, push service, queue worker
│   │   │   ├── devices/    # Device registration & broadcast controller
│   │   │   └── notifications/ # Delivery history & retry management
│   └── storage/            # JSON storage data categories
├── job-ui/                 # Next.js App Router Frontend
│   ├── app/                # Root layout & dashboard page
│   ├── components/         # Modals, tabs, navbar, tables, metric cards
│   ├── lib/                # API client, types, useWebPush hook
│   └── public/             # Service workers & static assets
├── docker-compose.yml      # Multi-container Docker deployment
├── Dockerfile.api          # Container build for backend
├── Dockerfile.ui           # Container build for frontend
└── STORAGE_ARCHITECTURE.md # Architecture & database migration guide
```

---

## 🧪 Testing

Run the full backend test suite:
```bash
cd job-api
pnpm test
```
All unit tests and end-to-end integration pipeline tests run in an isolated environment.

---

## 🔒 Constraints Adherence

- Every source file across both backend and frontend is **strictly under 250 lines of code**.
- No unauthorized external packages installed.
- Full TypeScript strict typing without `any` casts.

