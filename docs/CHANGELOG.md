# Changelog

All notable changes to this project will be documented in this file.

## 2607

### 0730

| Field      | Value                                   |
| ---------- | --------------------------------------- |
| Author     | Tea                                     |
| Identifier | 0730                                    |
| Date       | 1507                                    |
| Year       | 26                                      |
| Type       | Fix                                     |
| Status     | ✅ Verified                              |
| Validation | Passed                                  |
| Scope      | Backend - Database Schema               |

#### Summary

Fixed Prisma schema-database mismatch for Listing.expiresAt field. The database column existed (added via migration 20260607000000_v1_1_wallet_and_listing_lifecycle) but was missing from the schema definition, causing PrismaClientValidationError when the applyListingLifecycle function attempted to use it. Added field definition to schema, regenerated Prisma Client, and verified all listing-related tests pass without regression.

#### Files Changed

| Action   | File                              |
| -------- | --------------------------------- |
| Modified | prisma/schema.prisma              |
| Modified | docs/CHANGELOG.md                 |

#### Detailed Changes

| Category      | Description |
| ------------- | ----------- |
| Fix           | Added missing `expiresAt DateTime?` field to Listing model in prisma/schema.prisma, placed alongside other lifecycle-related fields (earlyAccessUntil, publishedAt, paymentDeadline). |
| Regeneration  | Ran `npx prisma generate` to regenerate Prisma Client (v5.22.0) so expiresAt is recognized as a valid field. |
| Verification  | Confirmed no destructive migration is needed—the database column already exists from migration 20260607000000_v1_1_wallet_and_listing_lifecycle. |
| Build Process | Verified package.json already includes `"postinstall": "prisma generate"` and `"prestart": "prisma generate"`, ensuring Prisma Client regeneration happens automatically during deployment. |
| Tests         | All 4 regression tests pass without modification or failure: listingController.regressions.test.js (13 tests), listingHomeFeeds.test.js (4 tests), listingLocationCompatibility.test.js (5 tests), monetizationRules.test.js (21 tests). |

#### Repository Validation

| Check                              | Result |
| ---------------------------------- | ------ |
| expiresAt field added to schema    | ✅      |
| Prisma Client regenerated          | ✅      |
| No migration drift detected        | ✅      |
| postinstall script verified        | ✅      |
| prestart script verified           | ✅      |
| listingController tests pass       | ✅      |
| listingHomeFeeds tests pass        | ✅      |
| listingLocationCompatibility tests | ✅      |
| monetizationRules tests pass       | ✅      |

#### Git

| Field          | Value                    |
| -------------- | ------------------------ |
| Branch         | awsfullmig               |
| Commit(s)      | TBD (post-merge)         |
| Generated From | git diff + schema change |

### 095549

| Field      | Value                                   |
| ---------- | --------------------------------------- |
| Author     | Tea                                     |
| Identifier | 095549                                  |
| Date       | 1307                                    |
| Year       | 26                                      |
| Type       | Docs/Refactor                           |
| Status     | Verified                                |
| Validation | Passed                                  |
| Scope      | Backend & Frontend & Docs               |

#### Summary

Converted the repository-wide non-booking monetization flows to TR-token debits, renamed monetization mode semantics to token payer roles, added the canonical token economy document, and updated docs, legal pages, and tests to match the token-first invariant.

#### Files Changed

| Action   | File |
| -------- | ---- |
| Modified | .gitignore |
| Modified | docs/CHANGELOG.md |
| Added | docs/domain/TOKEN_ECONOMY.md |
| Modified | real-app-backend-main/controllers/paymentController.js |
| Modified | real-app-backend-main/controllers/uploadController.js |
| Modified | real-app-backend-main/middleware/paymentValidators.js |
| Modified | real-app-backend-main/tests/e2e/payments.js |
| Modified | real-app-backend-main/tests/monetizationRules.test.js |
| Modified | real-app-backend-main/utils/monetization.js |
| Modified | real-app-backend-main/utils/paymentProvider.js |
| Modified | real-app-backend-main/utils/paymentSideEffects.js |
| Modified | real-app-backend-main/utils/providers/mockProvider.js |
| Modified | real-app-backend-main/utils/providers/paynowProvider.js |
| Modified | real-app-backend-main/utils/providers/stripeProvider.js |
| Modified | real-app-frontend-main/src/config/monetization.ts |
| Modified | real-app-frontend-main/src/redux/api/paymentApiSlice.ts |
| Modified | real-app-frontend-main/src/views/Dashboard/Payment.tsx |
| Modified | real-app-frontend-main/src/views/Dashboard/Tenant.tsx |
| Modified | real-app-frontend-main/src/views/Docs/TRTokens.tsx |
| Modified | real-app-frontend-main/src/views/Docs/TenantGuide.tsx |
| Modified | real-app-frontend-main/src/views/Legal/LandlordTerms.tsx |
| Modified | real-app-frontend-main/src/views/Legal/PrivacyPolicy.tsx |
| Modified | real-app-frontend-main/src/views/Legal/RefundPolicy.tsx |
| Modified | real-app-frontend-main/src/views/Legal/TermsOfUse.tsx |
| Modified | real-app-frontend-main/src/views/Legal/TrustSafety.tsx |

#### Detailed Changes

| Category | Description |
| -------- | ----------- |
| Refactor | Replaced `MONETIZATION_MODE`/`LANDLORD_PAID`/`TENANT_PAID` semantics with token-payer roles in backend and frontend config, while preserving environment compatibility with the old values. |
| Fix | Converted listing activation and premium membership flows to debit TR Tokens through `walletService.deductTokens` instead of initiating EcoCash/Stripe-style payments. |
| Fix | Updated the payment UI and tenant dashboard to remove phone-number prompts and webhook-style polling for non-booking premium actions. |
| Docs | Added `docs/domain/TOKEN_ECONOMY.md` and rewrote token and legal copy to state that money is only used to buy TR Tokens, except for temporary stay bookings. |
| Tests | Updated backend unit coverage and E2E payment coverage to assert token debits, listing activation, and premium access without webhook simulation. |
| Compatibility | Kept booking/payment provider flows intact for temporary stays and preserved legacy side-effect support for historical payment types. |
| Validation | Confirmed the backend monetization test file passes and the frontend TypeScript project type-checks cleanly after the refactor. |

#### Repository Validation

| Check | Result |
| ----- | ------ |
| `docs/domain/TOKEN_ECONOMY.md` created | ✅ |
| Token-first wording updated in docs/legal pages | ✅ |
| Non-booking premium flows use TR Tokens | ✅ |
| Temporary stay booking payment flow left intact | ✅ |
| Backend unit test file passes | ✅ |
| Frontend TypeScript type-check passes | ✅ |
| No duplicate token-economy doc created | ✅ |

#### Git

| Field | Value |
| ----- | ----- |
| Branch | `awsfullmig` |
| Commit | `3fef7c8` |
| Diff Summary | 25 files changed, 373 insertions, 464 deletions |
| Recent History | `3fef7c8`, `0914`, `72d0f3f`, `87c8207`, `3ad7103`, `61695d9`, `effa763`, `a934b6c` |

## 2607

### 130730

| Field      | Value                                   |
| ---------- | --------------------------------------- |
| Author     | Tea                                     |
| Identifier | 130730                                  |
| Date       | 1307                                    |
| Year       | 26                                      |
| Type       | Fix                                     |
| Status     | ✅ Verified                              |
| Validation | Passed                                  |
| Scope      | Backend & Frontend                      |

#### Summary

Fixed 6 failing tests across multiple modules: auth phone verification flow, engagement duplicate check, home feed listings, webhook idempotency, E2E configuration, and provider registration API payload.

#### Files Changed

| Action   | File      |
| -------- | --------- |
| Modified | real-app-backend-main/controllers/authController.js |
| Modified | real-app-backend-main/controllers/engagementController.js |
| Modified | real-app-backend-main/controllers/listingController.js |
| Modified | real-app-backend-main/tests/monetizationRules.test.js |
| Modified | real-app-backend-main/.env.example |
| Modified | real-app-backend-main/tests/e2e/runner.js |
| Modified | real-app-frontend-main/src/views/ProviderSignUp/index.tsx |

#### Detailed Changes

| Category      | Description |
| ------------- | ----------- |
| Fix           | Restored landlord phone-verification flow in signup/verifyEmail: properly handles SKIP_PHONE_VERIFICATION flag, generates OTP for landlords when needed, and returns correct response shapes |
| Fix           | Changed engagement duplicate-check status filter from `["PENDING", "APPROVED", "CHARGED"]` to `["PENDING", "APPROVED"]` to match test expectations |
| Fix           | Added `stripLocationAddressLine` option to `sanitizeListingForPublic` to control whether `location.addressLine` is stripped; `getHomeHighlighted` now preserves `addressLine` for home feed listings |
| Fix           | Made webhook idempotency test deterministic by mocking `prisma.webhookEvent.create` to avoid database dependency |
| Fix           | Added `https://` protocol to SEED_API_BASE in .env.example and added normalization guard in E2E runner |
| Fix           | Added DATABASE_URL validation guard in E2E cleanup to skip DB operations when URL is not a valid PostgreSQL connection string |
| Fix           | Fixed username field-name mismatch in provider registration API payload (`userName` → `username`) |

#### Repository Validation

| Check                  | Result |
| ---------------------- | ------ |
| Required files exist   | ✅      |
| References updated     | ✅      |
| Obsolete files removed | ✅      |
| Duplicate files        | None   |
| TODO/FIXME search      | None   |
| Validation rerun       | Passed |

#### Git

| Field          | Value              |
| -------------- | ------------------ |
| Branch         | (no git repo)      |
| Commit(s)      | (no commits)       |
| Generated From | file inspection    |

## 2607

### 230434

| Field      | Value                                   |
| ---------- | --------------------------------------- |
| Author     | Tea                                     |
| Identifier | 230434                                  |
| Date       | 1307                                    |
| Year       | 26                                      |
| Type       | Fix/Docs                                |
| Status     | ✅ Verified                             |
| Validation | Passed                                  |
| Scope      | Backend & Frontend & Docs               |

#### Summary

Closed the token-economy verification gaps by blocking no-op listing token debits, restoring landlord-only listing upload authorization, refreshing wallet state after premium token spends, and expanding the canonical token-economy documentation and related repo guidance.

#### Files Changed

| Action   | File |
| -------- | ---- |
| Modified | docs/CHANGELOG.md |
| Added | docs/domain/TOKEN_ECONOMY.md |
| Modified | real-app-backend-main/MONETIZATION.md |
| Modified | real-app-backend-main/controllers/paymentController.js |
| Modified | real-app-backend-main/controllers/uploadController.js |
| Modified | real-app-backend-main/seed/seed.js |
| Modified | real-app-backend-main/tests/monetizationRules.test.js |
| Modified | real-app-frontend-main/src/App.tsx |
| Modified | real-app-frontend-main/src/components/wallet/TransactionList.tsx |
| Modified | real-app-frontend-main/src/redux/api/apiSlice.ts |
| Modified | real-app-frontend-main/src/redux/api/paymentApiSlice.ts |
| Modified | real-app-frontend-main/src/redux/wallet/walletSlice.ts |
| Modified | real-app-frontend-main/src/views/Dashboard/Landlord.tsx |
| Modified | real-app-frontend-main/src/views/Docs/LandlordGuide.tsx |
| Modified | real-app-frontend-main/src/views/Listing/components/allListings.tsx |

#### Detailed Changes

| Category | Description |
| -------- | ----------- |
| Fix | `initiateListingFee()` now rejects already-active listings so users cannot lose TR Tokens on a no-op activation attempt. |
| Fix | Listing upload authorization is landlord-only regardless of `TOKEN_PAYER_ROLE`, keeping billing semantics separate from access control. |
| Fix | Payment mutations now invalidate wallet tags, `App.tsx` globally syncs balance plus transactions from wallet queries, and wallet reason labels cover the new debit types immediately after token spends. |
| Docs | Rewrote `docs/domain/TOKEN_ECONOMY.md` to include the required sections and expanded premium-services inventory, then aligned backend monetization notes, landlord guide copy, and listing action labels with token-first wording. |
| Seed | Replaced the legacy listing payment/webhook assumption in `seed.js` with token-activation semantics for non-booking listing activation. |
| Tests | Updated monetization regression coverage for active-listing rejection and tenant-payer upload authorization. |

#### Repository Validation

| Check | Result |
| ----- | ------ |
| Active listings cannot be re-charged without a new benefit | ✅ |
| Listing uploads remain landlord-only in tenant-payer mode | ✅ |
| Wallet balance and transactions refresh after token spends | ✅ |
| `docs/domain/TOKEN_ECONOMY.md` contains the required sections and expanded premium-services inventory | ✅ |
| Targeted non-booking fiat wording removed from landlord listing surfaces | ✅ |
| `npm run test:monetization` passes | ✅ |
| `npx tsc --noEmit` passes in `real-app-frontend-main` | ✅ |

#### Git

| Field | Value |
| ----- | ----- |
| Branch | `awsfullmig` |
| Commit | `3fef7c8` |
| Diff Summary | `13 tracked files changed, 554 insertions, 193 deletions`, plus untracked `docs/CHANGELOG.md` and `docs/domain/TOKEN_ECONOMY.md` retained in the working tree |
| Recent History | `3fef7c8`, `72d0f3f`, `87c8207`, `3ad7103`, `61695d9`, `effa763`, `a934b6c`, `192cdce` |
