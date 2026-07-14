# Monetization

## Token Payer Role

- Backend token-payer configuration is `TOKEN_PAYER_ROLE`.
- Supported values are `LANDLORD` and `TENANT`.
- The configured role governs non-booking premium token deductions.

## Business Rules

- Non-booking premium flows consume TR Tokens rather than fiat.
- Listing activation and restoration use the configured token cost.
- Tenant premium access uses the configured token cost for 30 days of access.

## Enforcement Points

- Listing activation and restoration use TR-token debits via the payment controllers.
- Provider webhooks no longer grant non-booking premium access for legacy payments; those rows require manual migration instead.

## Premium Token Spend Endpoints

- `POST /api/v1/payments/listing-fee`
- `POST /api/v1/payments/tenant-premium`
- `GET /api/v1/payments/mine`

## Stay Payment Webhook

- `POST /webhooks/payment` (Paynow/Stripe result URL for sanctioned temporary-stay booking payments only)

## E2E Test Suite

The modular runner is at `tests/e2e/runner.js`. It runs five test groups sequentially with fail-fast behaviour.

| File | Covers |
| --- | --- |
| `tests/e2e/auth.js` | Signup (landlord + tenant), duplicate email rejection, login, wrong password, `GET /me` with/without token, protected route guards |
| `tests/e2e/listings.js` | Create listing, active status assertion, 1-listing limit, tenant access-control (create/update/delete), update listing, public feed, all filters (location, minRent/maxRent, minTotalRooms, solar, searchTerm, minBedrooms, furnished), home highlighted, grouped-by-location |
| `tests/e2e/payments.js` | Token-based listing activation, early_access gate for non-premium tenant, token-based tenant premium activation, early_access visible to premium tenant, wallet debit capture, `GET /payments/mine` for both roles, cross-role access control |
| `tests/e2e/saved-searches.js` | Landlord blocked from creating/listing saved searches, tenant creates saved search, `GET /mine`, delete, `GET /mine` after delete |
| `tests/e2e/profile.js` | `GET /me` for both roles, update landlord profile (returns new token + updated fields), `GET /me` after update |

Run the suite with:

```sh
PAYMENT_PROVIDER=mock npm run test:e2e
```
