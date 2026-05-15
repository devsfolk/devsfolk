# OmniStore

OmniStore is a customizable multi-business storefront and admin dashboard built with React and Vite. The goal is to use one product foundation for multiple client types such as beauty brands, perfume sellers, mobile shops, and other retail businesses without redesigning the UI for each project.

## Current Direction

- Preserve the existing DevsFolk visual theme
- Keep mobile storefront and dashboard layouts stable
- Replace prototype-grade local state with production-ready Supabase-backed data and auth
- Support flexible ordering flows: `WHATSAPP`, `WEBSITE`, or `BOTH`

## Local Development

Prerequisites:

- Node.js 20+

Setup:

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Add your Supabase project values to `.env.local`
4. Start the app with `npm run dev`

## Supabase Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run the SQL in `supabase/schema.sql`.
4. Create your admin user in Supabase Auth using the email/password you want for dashboard access.
5. Put your project URL and anon key into `.env.local`.

Notes:

- Use the project base URL like `https://your-project.supabase.co`, not the `/rest/v1/` endpoint.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Do not expose it in client code.
- Orders are insertable from the storefront and readable by authenticated admins only.
- The schema includes a `track_order(order_id, phone)` RPC for safer public tracking later.

## Available Scripts

- `npm run dev` starts the local development server
- `npm run build` creates a production build
- `npm run preview` previews the production build locally
- `npm run lint` runs TypeScript type-checking

## Production Roadmap

- Migrate admin authentication to Supabase Auth
- Move products, categories, orders, reviews, and settings into Supabase
- Add secure storage for media uploads
- Add PWA install support for the dashboard
- Add configurable Google Analytics support
- Harden security and remove all remaining demo-only behavior
