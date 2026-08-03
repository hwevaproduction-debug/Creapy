IMPLEMENTATION PLAN - Creapy
Prepared: 2026-08-03T10:05:00+02:00
Author: Principal Platform Engineer

Purpose
-------
Concrete, prioritized implementation plan to migrate Creapy from an AWS-managed deployment (Amplify, Elastic Beanstalk, RDS, S3) to a single-host Docker Compose production on one Ubuntu EC2 instance. Each task is scoped, lists files to change or create, verification steps, and rollback considerations.

Guiding principles
------------------
- Non-destructive by default: keep cloud-specific code until compatibility layer is in place and migration strategy verified.
- Incremental, testable steps with clear validation gates.
- Preserve existing CI/tests and use them to validate changes.
- All production secrets moved to a secrets manager or Docker secrets; never commit secrets.
- Document every change and update docs and changelog concurrently.

Branching and release process
-----------------------------
- Create branch: feature/docker-migration
- Use short-lived feature branches for sub-tasks (feature/docker-migration/storage-abstraction, feature/docker-migration/dockerfiles)
- All changes must pass unit tests and E2E CI (modified to run in Docker Compose where applicable).
- Create PRs with description referencing this implementation plan and MIGRATION_REPORT.md

High-level phases (mapped to user phases)
-----------------------------------------
Phase 1 — Audit (done)
- MIGRATION_REPORT.md produced.

Phase 2 — Deployment Simplification (this plan)
Phase 3 — Docker Readiness
Phase 4 — PostgreSQL Migration
Phase 5 — Image Storage (local provider)
Phase 6 — Environment Variables
Phase 7 — Repository Cleanup
Phase 8 — Reverse Proxy Preparation
Phase 9 — Documentation
Phase 10 — CI/CD
Phase 11 — Security
Phase 12 — Validation and Release

Timeline and priority
---------------------
- Sprint 0 (2 days): Prepare design, create branch, add MIGRATION_REPORT.md and IMPLEMENTATION_PLAN.md (this file). Verify E2E CI baseline.
- Sprint 1 (5 working days): Storage abstraction + Local provider, avoid breaking S3 paths; add upload directory support and config; basic Dockerfiles and docker-compose prototype; .env examples.
- Sprint 2 (5 working days): Harden Dockerfiles, add healthchecks, volumes, named networks, Postgres service, run migrations and seed in-compose; update server to support container startup ordering.
- Sprint 3 (3 working days): Reverse proxy (Nginx conf), TLS notes, finalize env examples, update docs and runbooks.
- Sprint 4 (2 working days): CI updates, disable/remove Amplify/EB workflows, test deployment on a staging EC2 instance, iterate.
- Buffer + validation (3 days): Full validation, security review, rollback plan, changelog updates, merge and tag.

Detailed task list (ordered)
----------------------------
1) Create Storage Provider Abstraction (priority: high)
- Goal: Allow Local storage as default while preserving S3 provider.
- Files to add/modify:
  - real-app-backend-main/utils/storage/index.js (new) — exports getProvider()
  - real-app-backend-main/utils/storage/localProvider.js (new)
  - real-app-backend-main/utils/storage/s3Provider.js (new or refactor of uploadController logic)
  - real-app-backend-main/controllers/uploadController.js — replace direct S3Client usage with provider abstraction (thin wrapper)
  - real-app-backend-main/package.json — keep @aws-sdk packages until S3Provider remains supported
- Behavior:
  - Default provider: LocalProvider when ENV STORAGE_PROVIDER is unset or set to "local".
  - Local upload path configurable via UPLOADS_DIR (default: /srv/uploads).
  - Public URL for local files built from APP_BASE_URL or FRONTEND_URL + /uploads/<key>
- Validation:
  - Unit tests for upload endpoints using local provider.
  - E2E: Upload an image via signed URL or direct upload path — verify file exists under /srv/uploads and public URL serves file via frontend or nginx.
- Rollback: Keep old uploadController.js as uploadController.s3.js until validated.

2) Add Dockerfiles and .dockerignore (priority: high)
- Files to add:
  - real-app-backend-main/Dockerfile (production-optimized)
  - real-app-frontend-main/Dockerfile
  - docker-compose.yml (root) — defines frontend, backend, postgres, redis (optional), nginx reverse-proxy service or documented instructions to run nginx on host
  - docker-compose.override.yml (development) — mounts source, hot-reload
  - .dockerignore files in backend and frontend
- Key Dockerfile requirements:
  - Use node:20-slim
  - Install only production deps in build stage; run prisma generate in build; copy generated client into final image
  - Non-root user in containers (create app user UID/GID configurable)
  - Healthcheck endpoints (e.g., /health or /api/health)
  - Entrypoint runs server.js with signal handling
- Validation:
  - docker-compose build && docker-compose up --abort-on-container-exit in dev with minimal env to run tests
  - Verify backend connects to postgres service
- Rollback: Keep existing start scripts intact until compose validated

3) Make backend Docker-ready (priority: high)
- Files to modify:
  - server.js/app.js — ensure port and DB host configurable via env; do not assume localhost; no AWS-specific code in startup path
  - real-app-backend-main/package.json scripts: add docker:start script that runs prisma generate and starts node server
  - prisma: ensure migrations can be run via `npx prisma migrate deploy --schema=prisma/schema.prisma` in container
- Ordering and startup: docker-compose service for backend depends_on postgres with healthcheck; also run migration job as init container or entrypoint logic when container is leader
- Validation:
  - Run compose up and verify migrations run, server starts, background jobs behave as expected with NODE_ENV=production flag disabled during validation if needed

4) PostgreSQL as container + migration workflow (priority: high)
- docker-compose.yml defines postgres:16 with named volume pgdata
- Ensure Prisma DATABASE_URL defaults to postgres://postgres:postgres@postgres:5432/creapy?schema=public
- Add scripts and docs for migrating from RDS to local Postgres:
  - Create DB dump from RDS (pg_dump) and restore into local postgres container
  - Ensure migration history table (prisma_migrations) is intact or migrations are applied orderly
- Automation:
  - Provide helper in repo: scripts/docker-db-restore.sh (not committed with secrets) — documented in DOCKER_DEPLOYMENT_GUIDE.md
- Validation:
  - Run migrations inside container, run seed:db, run test:e2e
- Rollback:
  - Keep RDS live until data migration verified; have RDS snapshot for rollback

5) Local uploads & web serving (priority: high)
- Serve uploaded files via Nginx mounted to volume where backend writes: /srv/uploads
- Backend must ensure atomic writes and safe filenames
- Files to add/modify:
  - real-app-backend-main/utils/storage/localProvider.js
  - real-app-backend-main/config/defaults.js or similar for UPLOADS_DIR and PUBLIC_UPLOAD_PATH
  - nginx/prod.conf (to serve /uploads static and proxy /api to backend)
- Validation:
  - Upload an asset, ensure accessible via https://<host>/uploads/<path>

6) Environment variable consolidation (priority: high)
- Create .env.example, .env.production.example, .env.development.example at repo root and in real-app-backend-main
- Group envs by category (Frontend, Backend, Database, Security, Uploads, Email, Logging, Application). Use MIGRATION_REPORT.md inventory as source.
- Remove obsolete envs from examples (document legacy ones and mark DEPRECATED)
- Files to add/modify:
  - docs/ENVIRONMENT_VARIABLE_REFERENCE.md (drafted, final placed in docs/)
  - real-app-backend-main/.env.example (subset for backend)
- Validation:
  - run docker-compose using .env.production.example (with placeholder secrets) and ensure app starts with expected missing-value errors for required secrets

7) Reverse proxy prep (priority: medium)
- Add nginx config templates and instructions to enable HTTPS via Certbot on host or use Caddy (optional). For Compose, either:
  - Use an nginx container fronting frontend and backend (recommended for single host), or
  - Use host-managed nginx and bind mount from compose volumes
- Files to add:
  - docker/nginx/default.conf (proxy rules)
  - docs/REVERSE_PROXY.md
- Validation:
  - curl -I http://localhost and verify HTML served and /api proxied to backend

8) CI/CD & workflows (priority: medium)
- Update .github/workflows:
  - e2e.yml remains but ensure it uses docker-compose if needed or uses the existing postgres service; adapt tests to run against backend image if needed
  - Add a build workflow (optional) that builds images and pushes to registry if desired
  - Identify and disable Amplify/EB deployment workflows (if any) and archive them in docs/repo_cleanup
- Files to modify:
  - .github/workflows/* (edit or move obsolete files to docs/archive)
- Validation:
  - Run GitHub Actions in branch to ensure e2e passes

9) Repository cleanup (priority: low until migration validated)
- Items to remove or archive (after migration validated):
  - real-app-backend-main/.ebextensions/
  - Root amplify.yml and any amplify hosting packaging artifacts
  - real-app-backend-main.zip (large binary)
  - scripts that only target cloud provider routines (or move into optional/legacy folder with README)
- Process:
  - Move to docs/archived_infra or content/archive first, leave PR referencing MIGRATION_REPORT
- Validation:
  - Ensure no runtime code references removed files; run grep for keywords and unit tests.

10) Security hardening (priority: medium)
- Implement non-root container users and set restrictive file permissions for volumes
- Document how to store secrets: Docker secrets, AWS Secrets Manager (if still used outside), or environment variables managed by systemd for local host
- Ensure JWT_SECRET and DB credentials are rotated and not committed
- Files to modify/add:
  - Dockerfile: create non-root user and chown /srv/uploads
  - docs/SECURITY.md detailing rotation and secret provisioning
- Validation:
  - Confirm containers run as non-root and volumes have correct ownership

11) Documentation updates (priority: high ongoing)
- Update README to reflect single-host Docker Compose deployment, and create DOCKER_DEPLOYMENT_GUIDE.md (detailed), DEPLOYMENT_ARCHITECTURE.md (diagram), ENVIRONMENT_VARIABLE_REFERENCE.md, and CHANGELOG entry
- Files to add/modify:
  - README.md (root) — short summary with links
  - docs/deployment/DEPLOYMENT.md — rewrite for Docker Compose
  - docs/architecture/DEPLOYMENT_ARCHITECTURE.md
- Validation:
  - Follow DOCKER_DEPLOYMENT_GUIDE.md on a fresh Ubuntu EC2 instance and deploy stack successfully

12) Validation and release (priority: high)
- End-to-end validation checklist:
  - docker-compose up in staging runs and all containers healthy
  - Prisma migrations applied and seed:db works
  - Upload flow with LocalProvider stores files under /srv/uploads and served via nginx
  - Background workers run correctly and don't break in production mode
  - Unit tests and E2E tests pass (CI)
  - Security checks: containers non-root, secrets not in repo, minimal attack surface
- Release:
  - Create tag vX.Y.Z-migration
  - Merge feature branch after approvals
  - Keep old production deployment (RDS / S3) live until all verification is complete and data migrated

Operational runbook (summary)
-----------------------------
- Provision EC2 Ubuntu 22.04, attach EBS volume for persistent data (mount to /var/lib/docker/volumes or /srv/uploads), install Docker and Docker Compose v2.
- Copy env file to server /etc/creapy/.env (protected permissions) or use Docker secrets.
- Start stack: docker compose up -d
- Postgres backup: use pg_dump from RDS -> restore to local postgres via psql
- For SSL: set up certbot and configure nginx to use /etc/letsencrypt

Data migration notes
--------------------
- S3 -> Local uploads:
  - Identify all objects in S3 (by prefix used in uploads)
  - Use aws s3 sync s3://bucket/uploads /local/path/uploads --exclude patterns as needed
  - Ensure file ownership and permissions match container expectations
  - Update database rows referencing S3 public URLs to the new public path, or implement a compatibility middleware that resolves S3 URLs to local paths until migration complete
- Postgres:
  - Take snapshot of RDS and run pg_dumpall / pg_dump of specific DB
  - Restore to local postgres and run `npx prisma migrate resolve` or apply migrations as necessary; ensure prisma_migrations state is consistent

Rollback plan
-------------
- Keep RDS and S3 active until local deployment verified
- If critical failure, rollback by pointing load balancer (nginx DNS) back to existing production host(s)
- Keep database snapshots and S3 backups available for at least 7 days after cutover

Deliverables (to create while implementing)
-------------------------------------------
- docker-compose.yml, Dockerfile.frontend, Dockerfile.backend, .dockerignore
- real-app-backend-main/utils/storage/* (abstraction and providers)
- .env.example, .env.production.example, .env.development.example
- DOCKER_DEPLOYMENT_GUIDE.md, DEPLOYMENT_ARCHITECTURE.md, ENVIRONMENT_VARIABLE_REFERENCE.md, REPOSITORY_CLEANUP_REPORT.md
- CHANGELOG entry for the migration (docs/CHANGELOG.md and root CHANGELOG)

Acceptance criteria
-------------------
- Repository builds and runs locally with docker-compose up
- Backend connects to postgres container and serves endpoints
- Uploads stored to /srv/uploads and served via nginx
- All documentation updated and accurate
- CI tests pass against the new compose-based environment
- All references to Amplify/EB/RDS/S3 either removed or documented as legacy in archive

Next immediate actions (actionable tasks for next 24h)
-----------------------------------------------------
1. Create feature/docker-migration branch and open PR template referencing this plan.
2. Implement the storage provider abstraction (localProvider + s3Provider shim) and switch uploadController to use abstraction behind STORAGE_PROVIDER env var. Keep original S3 logic intact in s3Provider.js.
3. Add backend Dockerfile and .dockerignore; add docker-compose.yml prototype with postgres and backend only.
4. Draft .env.example and update README to point to new guide draft.

Estimated effort: 2 days to have a working compose prototype; 2-3 sprints to production readiness and documentation.

Appendix: Files modified/created (initial)
-----------------------------------------
- Created: MIGRATION_REPORT.md, IMPLEMENTATION_PLAN.md
- To create: docker-compose.yml, real-app-backend-main/Dockerfile, real-app-frontend-main/Dockerfile, utils/storage/*, .env examples, DOCKER_DEPLOYMENT_GUIDE.md

End of IMPLEMENTATION PLAN
