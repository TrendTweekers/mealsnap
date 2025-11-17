# QStash Setup Instructions

## Environment Variables to Add to Vercel

Add these environment variables to your Vercel project:

1. Go to [vercel.com](https://vercel.com) → Your Project → Settings → Environment Variables
2. Add the following variables:

```
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=eyJVc2VySUQiOiJiMDI1N2E2Mi1kM2ZkLTRlOGEtYjE4YS0zZTAyYmRlMGY5OTgiLCJQYXNzd29yZCI6IjgwNmUxM2VlZGE4NjQ4NjZhYWRhMGU3NmEyZTE3NjM1In0=
QSTASH_CURRENT_SIGNING_KEY=sig_6QXtVRuhFNoiNT8J13n7iFZJKU83
QSTASH_NEXT_SIGNING_KEY=sig_6RunKfyv5a1QZneGQLSrdaLmJ7cW
```

3. Make sure to add them to **Production**, **Preview**, and **Development** environments (or at least Production)
4. Redeploy your application after adding the variables

## For Local Development

Add these to your `.env.local` file (DO NOT commit this file):

```bash
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=eyJVc2VySUQiOiJiMDI1N2E2Mi1kM2ZkLTRlOGEtYjE4YS0zZTAyYmRlMGY5OTgiLCJQYXNzd29yZCI6IjgwNmUxM2VlZGE4NjQ4NjZhYWRhMGU3NmEyZTE3NjM1In0=
QSTASH_CURRENT_SIGNING_KEY=sig_6QXtVRuhFNoiNT8J13n7iFZJKU83
QSTASH_NEXT_SIGNING_KEY=sig_6RunKfyv5a1QZneGQLSrdaLmJ7cW
```

## Install QStash Package (if needed)

If you plan to use QStash in your code, install the package:

```bash
npm install @upstash/qstash
# or
pnpm add @upstash/qstash
```

## Usage Example

```typescript
import { Client } from '@upstash/qstash'

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
})

// Publish a message
await qstash.publishJSON({
  url: 'https://your-app.com/api/webhook',
  body: { message: 'Hello from QStash!' },
})
```

