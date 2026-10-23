# Lumin

Lumin is a private space for profiles, events, memories, images, learning activities, and chat.

Sign in with an email address and password. New users can select **Create account**, confirm their email, and return to sign in. **Forgot password** sends a recovery link. Admission-number and phone-number logins have been retired. Older browser-only records are not automatically assigned to a new account.

Account records are stored in Netlify Database. Images are stored in Netlify Blobs and served through an authenticated endpoint. Saved content is private to the signed-in account. The save indicator reports pending changes, failures, and conflicts between devices. Keep the page open until it confirms that all changes are saved.

Chat uses Netlify AI Gateway and requires sign-in. Football tables and predictions are explicitly labeled historical, unverified demo data; they are not live sports coverage.

For local development, install dependencies with `npm ci`, then run `netlify dev --port 8889`. Database migrations are generated from `db/schema.ts` and applied by Netlify during deployment.

Run `npm run check` for TypeScript checks and `npm test` for validation tests. With the development server running, use `npx playwright install chromium` followed by `npx playwright test` for browser checks. Browser tests use mocked authenticated services; signed-out endpoint checks can also be performed against the local Netlify server.
