This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

For built-in messaging, offer tracking, notification retries, and the required manual Supabase setup, see [Messaging rollout](docs/messaging-rollout.md).

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Promotion payments

Featured and Top Pick use QR Ph through PayMongo hosted checkout with automatic verification. Follow [the PayMongo rollout guide](docs/paymongo-promotion-rollout.md) before enabling payments. **Apply migration 053 manually in the Supabase SQL Editor; migrations do not auto-apply.** The guide covers test/live credentials, webhooks, the required reconciliation schedule, legacy orders, and refunds.

## Estimator feedback

Price results support required Too low / Too high feedback and a suggested price, with admin review and email alerts. Follow [the feedback rollout guide](docs/price-feedback-rollout.md). **Apply migration 058 manually in the Supabase SQL Editor before deployment; migrations do not auto-apply.** The new pricing engine, monthly public-price refresh, and premium access remain in the review plan.

## Estimator beta and future paid access

See [estimator implementation and rollout](docs/price-estimator-implementation.md). Apply `supabase/migrations/059_estimator_platform.sql` manually in Supabase SQL Editor after migration 058; this project does not auto-apply migrations. The new estimator remains free beta and paid checkout defaults off. Optional scheduled workers require the separate manual `supabase/setup/estimator-jobs.sql` setup after deployment.
