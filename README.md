# Tylyn Tingz Creations

Website and online store for Tylyn Tingz Creations: custom party favors, party packages and 1-on-1 craft classes. Customers personalize an item, pay with Stripe (or Square), and the owner manages everything from `/admin`.

- **Storefront:** home, shop with collections, product pages with custom questions and photo upload, cart, Stripe checkout (card, Apple Pay, Google Pay, Klarna and any other method turned on in Stripe) with Square as a switchable alternative, order confirmation, gallery, policies and FAQs, contact.
- **Pickup and shipping:** shoppers choose local pickup or flat-rate shipping in the cart. Checkout collects contact info and an address on every order. Set the rate under **Admin → Site content → Pickup and shipping**.
- **My account (`/account`):** shoppers can create an account (on its own or while checking out) to see their orders, progress, tracking numbers and class times, and save their details for next time.
- **Quote requests:** a quote form (event date, services, guest count, details) on the home page and the contact page. Requests land under **Admin → Quote requests**, and the owner gets an email when email is set up.
- **Admin (`/admin`):** orders and class bookings with status tracking, private notes and refunds through Stripe or Square; payment processor keys and sales tax under **Payments**; products and services (prices, photos, the questions customers answer, add-ons, visibility); add-ons and collections; every piece of site copy (announcement bar, home page, gallery, policies, FAQs, contact and social links).

Built with Next.js 15, Prisma and Postgres, Tailwind 4, Stripe Checkout and the Square Node SDK.

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
   - `NEXT_PUBLIC_SITE_URL` and optionally the email settings. Payment keys and sales tax are entered in the admin under **Payments** (see below).
5. **Deploy.** Each deploy runs the database migrations automatically (the `vercel-build` script). The first deploy also adds the starter products; later deploys skip that step, so products you delete stay deleted.

The **Settings** page in the admin shows which of these are set.

## Payments

Pick the processor and enter its keys under **Admin → Payments**. Secret keys are encrypted with `AUTH_SECRET` before they're stored (changing `AUTH_SECRET` means re-entering them). Environment variables (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, the Square ones in `.env.example`, `SALES_TAX_PERCENT`) are used for anything not saved there.

### Stripe (default)

1. In the Stripe Dashboard, open Developers → API keys and copy the publishable and secret keys into **Admin → Payments**. Start with the test keys; the admin checks the secret key with Stripe before saving it.
2. Under Settings → Payment methods, turn on what you want offered: Klarna, Afterpay, Cash App Pay, Apple Pay, Google Pay. Checkout shows whatever is on there.
3. Under Developers → Webhooks, add `https://yourdomain.com/api/stripe/webhook` with `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` and `charge.refunded`. Paste its signing secret into **Admin → Payments**.
4. Place a test order with card `4242 4242 4242 4242`, any future date and any CVC.
5. **Go live:** swap in the live keys and the live webhook's signing secret.

Shoppers pay on Stripe's hosted checkout page, then come back to the order confirmation. Orders stay hidden from the admin until Stripe confirms the payment.

### Square

1. Sign in at developer.squareup.com with the business's Square account and create an application.
2. In **Admin → Payments**, choose Square, and enter the application ID and access token from the app's Credentials page and the location ID from the Locations page. Start in Sandbox and test with card `4111 1111 1111 1111`.
3. **Webhook (for refunds made in the Square dashboard):** under Webhooks → Subscriptions, add the URL shown on the Payments page with the `payment.updated` event, and paste the signature key into the Payments page.
4. **Apple Pay:** after the site is on its real domain, register the domain under the app's Apple Pay settings in Square.
5. **Go live:** switch the environment to Production with the production credentials.

## Order emails (optional)

With `RESEND_API_KEY`, `EMAIL_FROM` and `OWNER_NOTIFY_EMAIL` set, the customer gets a receipt and the owner gets a new-order email and a new-quote email. Verify the sending domain at resend.com first. Without these settings, orders still appear in the admin and in Stripe or Square.

## How checkout stays safe

- The server re-prices every cart from the database, so a changed price in the browser can't lower the total.
- Each checkout carries a one-time key, so a double-click can't charge twice.
- Card details go straight to Stripe or Square; this site never sees them.
- Admin pages and actions all require the signed admin session cookie.
