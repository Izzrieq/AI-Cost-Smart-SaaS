This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

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

## CostSmart AI providers

The `/api/ai` route tries Gemini first, then Groq, then OpenRouter's free-model router. If a provider is rate-limited or unavailable, the next configured provider is tried. When a fallback is used, the user's question and the business stats/products included with it are sent to that provider. Provider keys are server-only environment variables; do not prefix them with `NEXT_PUBLIC_`.

Add whichever backup keys you want to use to `.env.local`:

```dotenv
GROQ_API_KEY=
OPENROUTER_API_KEY=
```

Create keys at [Groq Console](https://console.groq.com/keys) and [OpenRouter Keys](https://openrouter.ai/settings/keys). Keep Groq on its free plan to avoid usage charges. OpenRouter uses `openrouter/free`, which selects from its free models only. Free services can have daily or per-minute limits, and availability changes by provider. Restart the Next.js dev server after changing `.env.local`.

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
