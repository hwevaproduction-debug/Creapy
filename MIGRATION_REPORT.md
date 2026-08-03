MIGRATION REPORT - Creapy

Prepared: 2026-08-03T09:58:49+02:00
Author: Principal Platform Engineer

Executive summary
-----------------
This audit inspects the repository and inventories all deployment, infra, storage, and runtime assumptions that tie the project to AWS managed services (Amplify, Elastic Beanstalk, RDS, S3), third-party hosts (Render), or any non-portable patterns. The goal is to prepare a single-host Docker Compose deployment on one Ubuntu EC2 instance.

High-level findings
-------------------
- Frontend: Currently designed for AWS Amplify. Top-level `amplify.yml` and `real-app-frontend-main/amplify.yml` govern builds. README explicitly instructs connecting `real-app-frontend-main` to Amplify.
- Backend: Contains Elastic Beanstalk artifacts (`real-app-backend-main/.ebextensions/01_prisma_migrate.config`) and build/deploy steps tailored to Amplify/EB. README mentions Render as current backend host in parts of the docs (frontend README references Render).
- Storage: Backend implements S3 signed-upload flow (controllers/uploadController.js) and includes `@aws-sdk/client-s3` and an S3 CORS helper script (scripts/configure-s3-cors.js). Code expects S3 env vars: S3_BUCKET, S3_REGION, S3_PUBLIC_BASE_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
- Database: Prisma + PostgreSQL expected. Database connection is driven by DATABASE_URL (server.js / prisma). Server logs reference Aurora PostgreSQL. EB extensions run prisma migrate. CI e2e workflow spins up a Postgres container for tests.
- CI: .github/workflows/e2e.yml exists (E2E tests). Primary application deployment is external: Amplify for frontend, Render/Elastic Beanstalk/Aurora for backend in current documented flows. GitHub Actions not currently used for production deploys in repo.
- Secrets & envs: Lots of env-driven behaviour across backend (JWT_SECRET, STRIPE keys, PAYNOW keys, EMAIL creds, SMS provider, etc.). Many envs are expected by amplify.yml in backend and frontend.

Repository evidence (representative files)
-----------------------------------------
- amplify.yml (root) — monorepo Amplify descriptor
- real-app-frontend-main/package.json — frontend build script (react-scripts) and proxy
- real-app-backend-main/package.json — backend scripts: prisma generate, migrate deploy, seed scripts, s3:cors script
- real-app-backend-main/.ebextensions/01_prisma_migrate.config — EB container command to run prisma migrate
- real-app-backend-main/controllers/uploadController.js — S3 signed URL flow (uses @aws-sdk/client-s3)
- real-app-backend-main/scripts/configure-s3-cors.js — sets S3 CORS using AWS SDK
- real-app-backend-main/prisma/schema.prisma — Prisma schema (Postgres models)
- .github/workflows/e2e.yml — CI e2e job using Postgres service
- README.md — references Amplify frontend and Render backend

Current deployment flow (as documented)
---------------------------------------
1. Developer pushes to GitHub.
2. Frontend: AWS Amplify detects monorepo (root `amplify.yml`) and builds `real-app-frontend-main` (npm ci, npm run build) and deploys to *.amplifyapp.com. REACT_APP_* envs injected by Amplify.
3. Backend: Historically deployed to Render or Elastic Beanstalk / Aurora. `amplify.yml` contains steps to build and package the backend for Amplify hosting, or EB runs migration via `.ebextensions`.
4. Post-deploy: Backend environment variables FRONTEND_URL / PAYNOW_RETURN_URL updated to the Amplify URL.

Runtime assumptions
-------------------
- PostgreSQL access via DATABASE_URL; logs reference Aurora but code accepts any Postgres-compatible DB.
- S3 for file uploads with presigned URLs; public file URLs are constructed from S3_PUBLIC_BASE_URL + key.
- ENV-based feature toggles (e.g. PAYMENT_PROVIDER=mock, SMS_PROVIDER=mock, SKIP_EMAIL_VERIFICATION).
- Background workers and cron jobs are launched by server.js when NODE_ENV !== 'test'.
- Prisma Client is generated at startup or during install (prisma generate in prestart/postinstall in package.json).

Environment variables (inventory)
---------------------------------
Collected from code and build scripts. Grouped by area.

Database
- DATABASE_URL
- SKIP_PRISMA_GENERATE_ON_START (controls prisma generation)

Application / Security
- NODE_ENV
- PORT
- JWT_SECRET
- JWT_EXPIRES_IN
- APP_BASE_URL
- FRONTEND_URL
- CORS_ALLOWED_ORIGINS

Uploads / Storage
- S3_BUCKET
- S3_REGION
- S3_PUBLIC_BASE_URL
- S3_ACCESS_KEY_ID
- S3_SECRET_ACCESS_KEY
- AWS_REGION

Payments
- PAYMENT_PROVIDER
- PAYNOW_INTEGRATION_ID
- PAYNOW_INTEGRATION_KEY
- PAYNOW_RESULT_URL
- PAYNOW_RETURN_URL
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_CURRENCY
- LISTING_FEE_AMOUNT
- TENANT_PREMIUM_AMOUNT
- TOKEN_PAYER_ROLE

Seeding / E2E
- SEED_API_KEY
- SEED_API_BASE
- SEED_* (ADMIN_EMAIL, ADMIN_PASSWORD) used in tests
- E2E_ADMIN_EMAIL
- E2E_ADMIN_PASSWORD

Email / Notifications
- EMAIL_FROM
- GMAIL_USER
- GMAIL_APP_PASSWORD
- SMS_PROVIDER
- SMS_ENABLED
- SKIP_EMAIL_VERIFICATION
- SKIP_PHONE_VERIFICATION

Operational / Tuning
- JSON_BODY_LIMIT
- MAX_PAYMENT_RETRIES
- RETRY_COOLDOWN_MINUTES
- NOTIFICATION_BATCH_SIZE
- Various CRON expressions (REMINDER_SCAN_CRON, RECONCILIATION_INTERVAL_CRON, EXPIRY_SCAN_CRON)

Tests / CI-only examples
- In GitHub Actions e2e.yml: JWT_SECRET, DATABASE_URL pointing to local postgres service, etc.

Storage strategy today
----------------------
- Production: S3 signed uploads with public URL base (S3_PUBLIC_BASE_URL). Backend returns signed upload URL and computed publicUrl.
- There are utilities and scripts to manage S3 CORS (scripts/configure-s3-cors.js).
- No local filesystem provider present as the default production provider.

Database configuration
----------------------
- Prisma used as ORM. Migrations are expected: `npx prisma migrate deploy` in build or via EB container hook.
- DATABASE_URL drives connection. Code references Aurora in logs (historical usage of AWS RDS/Aurora). Postgres is supported by CI.

Current upload strategy
-----------------------
- Signed URL flow: backend issues presigned PutObject URL for client to upload directly to S3.
- Public URL returned by backend derived from S3_PUBLIC_BASE_URL + key.
- Tests set env vars to mock S3 values.

Build process
-------------
- Frontend: `npm ci` -> `npm run build` (react-scripts), described in `amplify.yml` and package.json.
- Backend: `npm ci`, `npx prisma generate`, `npx prisma migrate deploy` (sometimes skipped if DB unreachable). Package.json also defines prestart/postinstall hooks to run prisma generate.

CI/CD pipeline
--------------
- GitHub Actions: e2e tests workflow present (.github/workflows/e2e.yml). The repo's documented deployment uses Amplify (frontend) and Render/EB for backend; GitHub Actions is not the primary production deploy mechanism today.

Documentation
-------------
- README and docs/ and content/ have Amplify and Render references. `real-app-frontend-main/AMPLIFY_ENV.md` referenced by README.
- docs/deployment/ contains environment variable docs and deployment steps oriented to current cloud services.

Startup & deployment scripts
----------------------------
- server.js starts app, ensures prisma client generation, starts background jobs when NODE_ENV !== 'test'.
- .ebextensions/01_prisma_migrate.config runs prisma migrate at EB deploy time.
- scripts/configure-s3-cors.js updates S3 bucket CORS rules using AWS SDK.
- package.json scripts include s3:cors, seed scripts, and build helpers.

AWS dependencies found
----------------------
- @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner used for S3 signed URLs and related scripts.
- .ebextensions directory used for Elastic Beanstalk container_commands.
- amplify.yml (root and backend) and other Amplify-specific packaging files.
- Code comments and logs referencing Aurora (RDS).

Obsolete or cloud-specific components (candidates for removal or migration)
---------------------------------------------------------------------------
- real-app-backend-main/.ebextensions/*  — Elastic Beanstalk hooks
- amplify.yml (root) and amplify.yml under apps — Amplify monorepo orchestration
- scripts/configure-s3-cors.js — S3-specific helper (keep if S3 remains optional; otherwise adapt)
- S3 presigned-upload controller (uploadController.js) — needs abstraction to support Local storage provider
- References and instructions that explicitly mention Render/Amplify/Aurora in README and docs — must be updated
- real-app-backend-main/.amplify-hosting packaging commands (in amplify.yml) — Amplify-hosting specific steps
- real-app-backend-main.zip — large packaged artifact checked into repo; likely obsolete and should be removed or archived elsewhere
- Any AWS-specific environment variables that are no longer relevant after migration (to be pruned once replacement envs are defined)

Initial risk notes
------------------
- Removing S3 and converting to local uploads requires careful migration of existing uploaded assets (if any) — plan for data migration from S3 to disk or EBS snapshot.
- Switching DB from managed RDS/Aurora to local Postgres requires migration strategy, connection string updates, and capacity planning for backups, failover, and maintenance.
- Prisma migrations: ensure `prisma migrate deploy` runs successfully in the new containerized environment; schema.migrations state must be preserved.
- Secrets handling: moving from cloud-managed env vars/secrets to .env or Docker secrets needs secure provisioning and rotation plan.

Recommended immediate next steps (Phase 1 completion)
----------------------------------------------------
1. Freeze destructive changes: do not delete S3 / DB related code yet. Plan a compatibility layer.
2. Create an abstraction for storage providers (LocalProvider + S3Provider) and configure LocalProvider as default for single-host deployment.
3. Prepare Dockerfiles and docker-compose in a separate branch (no production changes yet).
4. Create .env.example and production/development examples with only necessary variables for Docker Compose (DB host as postgres container, local upload path, JWT secret, Stripe keys optional).
5. Update documentation to clearly call out the migration plan and exact differences (this document will be part of that change set).

Appendix: Notable file locations (quick reference)
-------------------------------------------------
- Frontend: real-app-frontend-main/
- Backend: real-app-backend-main/
- EB hooks: real-app-backend-main/.ebextensions/
- Prisma schema: real-app-backend-main/prisma/schema.prisma
- S3: real-app-backend-main/controllers/uploadController.js
- S3 CORS script: real-app-backend-main/scripts/configure-s3-cors.js
- CI e2e: .github/workflows/e2e.yml
- Root amplify.yml: amplify.yml

End of Phase 1 audit.

Next deliverable (Phase 2): Implementation plan and prioritized ticket list to move repository to single-host Docker Compose deployment. This will include the exact files to add, modify, and remove; migration data steps for uploads and DB; and a timeline.
