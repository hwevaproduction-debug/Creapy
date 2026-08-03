# Amplify Environment Variables Checklist

> IMPORTANT: The values for `REACT_APP_API_URL` and `REACT_APP_BACKEND_URL` in `.env.production` are placeholder templates. They will not work unless they are overridden in the AWS Amplify Console before a production build.
> If the frontend is served over HTTPS, these values must also use `https://` or browsers will block the requests as mixed content.
> Set the variables below in the Amplify Console under App settings -> Environment variables before triggering any production build.

Amplify backend is the canonical production target. See `real-app-backend-main/DEPLOYMENT.md` for the full setup guide.

| Variable | Value / Source |
| --- | --- |
| `REACT_APP_API_URL` | Your Amplify backend URL + `/api/v1` (for example `https://<branch>.<appid>.amplifyapp.com/api/v1`) |
| `REACT_APP_BACKEND_URL` | Your Amplify backend URL with no path (for example `https://<branch>.<appid>.amplifyapp.com`) |
| `REACT_APP_FIREBASE_API_KEY` | From Firebase project settings |
| `REACT_APP_TOKEN_PAYER_ROLE` | Must match backend `TOKEN_PAYER_ROLE` and be set to `LANDLORD` or `TENANT` |
| `REACT_APP_LISTING_FEE_AMOUNT` | Must match backend `LISTING_FEE_AMOUNT` |
| `REACT_APP_TENANT_PREMIUM_AMOUNT` | Must match backend `TENANT_PREMIUM_AMOUNT` |
| `DISABLE_ESLINT_PLUGIN` | `true` if required for the Amplify build |
