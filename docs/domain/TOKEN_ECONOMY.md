# Token Economy

Money is only used to purchase TR Tokens. TR Tokens are the platform currency. Every premium platform feature consumes TR Tokens.

## Premium Services

| Premium Service | Token Requirement | Repository Scope / Notes |
| --- | --- | --- |
| Listing activation | Consumes TR Tokens | Non-booking premium listing lifecycle action |
| Listing restoration / renewal | Consumes TR Tokens | Non-booking premium listing lifecycle action |
| Tenant premium membership / early access | Consumes TR Tokens | Non-booking premium access window for early-access listings |
| Contact unlocks / engagement approvals | Consumes TR Tokens | Non-booking premium communication access between tenants and landlords |
| Landlord premium capabilities | Consumes TR Tokens | Premium landlord capabilities must use TR Tokens whenever enabled |
| Listing promotion | Consumes TR Tokens | Promotion-related premium listing exposure must use TR Tokens whenever enabled |
| Featured listings | Consumes TR Tokens | Featured placement must use TR Tokens whenever enabled |
| Priority exposure / placement | Consumes TR Tokens | Priority ranking or placement must use TR Tokens whenever enabled |
| Boosts | Consumes TR Tokens | Any visibility or reach boost must use TR Tokens whenever enabled |
| Future premium capabilities | Consumes TR Tokens | Any future premium platform feature must use TR Tokens unless it is the Temporary Stay exception |

## Temporary Stay Exception

Temporary Stay bookings are the only exception to the token-only rule. Real accommodation reservations use real payment processing for booking charges, partial payments, refunds, cancellations, settlements, and provider payout flows. This exception applies only to the booking / stay / accommodation / room domain and does not extend fiat payment to any non-booking premium platform feature.

## Repository Invariant

Users never pay money directly for platform features. Money is only used to purchase TR Tokens. TR Tokens are the platform currency. Every premium platform feature consumes TR Tokens. The ONLY exception is Temporary Stay bookings (real accommodation reservations, real payments). Everything else must use TR Tokens.
