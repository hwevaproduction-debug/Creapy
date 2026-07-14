# Monetization Rules

## Token Payer Role

- Frontend token-payer configuration is `REACT_APP_TOKEN_PAYER_ROLE`.
- `REACT_APP_TOKEN_PAYER_ROLE` must match backend `TOKEN_PAYER_ROLE`.
- Supported values are `LANDLORD` and `TENANT`.

## Business Rules Implemented

- Public listing browse and listing detail views are free and do not require payment UI.
- Non-booking premium flows use TR Tokens rather than fiat payments.
- Landlords can sign up and manage profile for free.
- Listing activation and premium access use token-based flows.

## Current Frontend Behavior

- Listing browsing and viewing routes are public (`/`, `/search`, `/listing/:id`).
- Token-based premium UI is driven by wallet balance and token costs rather than fiat subscription status.
- Premium access and listing activation flows use the token wallet semantics from the backend.

## Configuration Flow

The frontend reads `REACT_APP_TOKEN_PAYER_ROLE` from the environment and applies it to non-booking premium flows in `src/config/monetization.ts`.

## Where To Change Token Logic

- Token role parsing and premium semantics:
  - `src/config/monetization.ts`
- Wallet and premium access UI:
  - `src/views/Docs/TRTokens.tsx`
  - `src/views/Listing/index.tsx`

## Backend Contract Expected By Frontend

- `GET /api/v1/users/me` returns the current user with wallet and premium state.
- Non-booking premium endpoints must enforce token balance and return clear failures when the balance is insufficient.
