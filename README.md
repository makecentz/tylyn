# Tylyn Tingz Creations

Website and online store for Tylyn Tingz Creations: custom party favors, party packages and 1-on-1 craft classes. Customers personalize an item, pay with Square, and the owner manages everything from `/admin`.

- **Storefront:** home, shop with collections, product pages with custom questions and photo upload, cart, Square checkout (card, Apple Pay, Google Pay, Cash App Pay), order confirmation, gallery, policies and FAQs, contact.
- **Admin (`/admin`):** orders and class bookings with status tracking, private notes and Square refunds; products and services (prices, photos, the questions customers answer, add-ons, visibility); add-ons and collections; every piece of site copy (announcement bar, home page, gallery, policies, FAQs, contact and social links).

Built with Next.js 15, Prisma and Postgres, Tailwind 4 and the Square Node SDK.

## Store notes

- **No tobacco is sold on this site.** Backwood packs and hookah pens were removed from every I'm Outside package. Square restricts tobacco sales through online checkout.
- Sip Pretty ($60), Handle With Care ($85), the Party Bundle ($125) and the 1-on-1 Class ($250) take orders online.
- Pour Decisions, Let's Get Lit, Vibes In The Air and the Premium Pack still show their old flyer prices, which included tobacco. They show a "Request this package" button instead of checkout. Set the new price under **Admin → Products and services** and turn on **Online checkout**.
- The à la carte items (chip bags, Capri Suns, gable boxes, activity sheets) are hidden until they have prices.

## Run it locally

Requires Node 20+ and a Postgres database.

```bash
npm install
cp .env.example .env          # then fill it in, see below
npm run hash-password -- "choose-a-password"   # paste the .env line it prints
npx prisma migrate deploy     # create the tables
npm run db:seed               # add the starting products (safe to re-run, never overwrites edits)
npm run dev
```

Open http://localhost:3000 and sign in at http://localhost:3000/admin.

## Deploy on Vercel

1. **Import the repo** at vercel.com/new.
2. **Add a database:** in the project, go to Storage → Create → Neon (Postgres). Vercel adds `DATABASE_URL` for you.
3. **Add image storage:** Storage → Create → Blob. Vercel adds `BLOB_READ_WRITE_TOKEN`.
4. **Add the environment variables** from `.env.example` under Settings → Environment Variables:
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`. Use the "For Vercel" line from `npm run hash-password`, without the backslashes.
   - `AUTH_SECRET`: any long random string (`openssl rand -base64 32`).
   - The Square values (see below), `NEXT_PUBLIC_SITE_URL`, and optionally `SALES_TAX_PERCENT`, `SHIPPING_FLAT_RATE` and the email settings.
5. **Deploy.** Each deploy runs `prisma migrate deploy` automatically (the `vercel-build` script).
6. **Seed once:** from your computer, with `DATABASE_URL` pointing at the Neon database, run `npm run db:seed`.

The **Settings and Square** page in the admin shows which of these are set.

## Square setup

1. Sign in at developer.squareup.com with the business's Square account and create an application.
2. Start in **Sandbox**. From the app's Credentials page, copy:
   - the access token into `SQUARE_ACCESS_TOKEN`
   - the application ID into `NEXT_PUBLIC_SQUARE_APPLICATION_ID`
3. From the Locations page, copy the location ID into `NEXT_PUBLIC_SQUARE_LOCATION_ID`.
4. Set `SQUARE_ENVIRONMENT=sandbox` and place a test order with Square's test card `4111 1111 1111 1111`, any future date, any CVV and any ZIP.
5. **Webhook (for refunds made in the Square dashboard):** under Webhooks → Subscriptions, add `https://yourdomain.com/api/square/webhook` with the `payment.updated` event. Put the signature key in `SQUARE_WEBHOOK_SIGNATURE_KEY` and the exact same URL in `SQUARE_WEBHOOK_URL`.
6. **Apple Pay:** after the site is on its real domain, register the domain under the app's Apple Pay settings in Square.
7. **Go live:** switch to the Production credentials, set `SQUARE_ENVIRONMENT=production`, and redeploy.

Payments show up in the Square Dashboard like any other sale, with the customer's personalization in the item notes.

## Order emails (optional)

With `RESEND_API_KEY`, `EMAIL_FROM` and `OWNER_NOTIFY_EMAIL` set, the customer gets a receipt and the owner gets a new-order email. Verify the sending domain at resend.com first. Without these settings, orders still appear in the admin and in Square.

## How checkout stays safe

- The server re-prices every cart from the database, so a changed price in the browser can't lower the total.
- Each checkout carries a one-time key, so a double-click can't charge twice.
- Card details go straight to Square; this site never sees them.
- Admin pages and actions all require the signed admin session cookie.
