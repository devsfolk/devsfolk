# OmniStore Project Documentation

## Overview

OmniStore is a reusable multi-business storefront and admin dashboard built for selling the same product to different business owners with business-specific branding, products, categories, and order preferences.

Current live business example:
- `junfragrance.com`

Core model:
- One storefront
- One dashboard
- Business branding and store settings controlled from dashboard
- Supabase used for database and auth
- Vercel used for hosting

## Main Features

- Storefront with product browsing, categories, wishlist, cart, checkout, and order tracking
- Dashboard with store settings, product management, category management, design settings, and order management
- Theme selection with DevsFolk theme preserved
- Order mode support:
  - `WEBSITE`
  - `WHATSAPP`
  - `BOTH`
- Social media links managed from dashboard
- Global trust feature blocks managed from dashboard
- Google Analytics setting in dashboard
- Dashboard PWA install support for phone home screen access

## Tech Stack

- `React`
- `TypeScript`
- `Vite`
- `React Router`
- `Supabase`
- `Vercel`

## Supabase Setup

Environment variables used by frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Important:
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to browser code

Main tables from `supabase/schema.sql`:
- `store_settings`
- `categories`
- `products`
- `reviews`
- `orders`

Main RPC:
- `track_order(order_id, phone)`

## Hosting Setup

Frontend hosting:
- Vercel

Database/auth:
- Supabase

Production URLs:
- Storefront: `https://www.junfragrance.com`
- Dashboard: `https://www.junfragrance.com/dashboard`
- Dashboard login: `https://www.junfragrance.com/dashboard/login`

## Admin Login

Dashboard uses Supabase email/password authentication.

## Order Flow

Supported order behavior:
- If order mode is `WEBSITE`, checkout uses website order flow
- If order mode is `WHATSAPP`, checkout uses WhatsApp flow
- If order mode is `BOTH`, both options are shown

Dashboard order behavior:
- Orders are stored in Supabase
- Dashboard refreshes admin orders from Supabase
- Admin-side order sync polling is enabled so newly placed website orders appear automatically

## Data Sync Model

- Store settings, categories, products, reviews, and orders are synced with Supabase
- Local storage is still used for client-side persistence where helpful
- Existing local admin store data can be promoted to Supabase when needed

## PWA Support

Dashboard PWA support includes:
- manifest
- service worker
- dashboard install prompt
- phone home screen install behavior

## Important Project Rules

- Do not change the DevsFolk theme UI without explicit approval
- Mobile dashboard and storefront layouts are considered locked
- Avoid changing mobile-specific layout behavior unless explicitly requested

## SEO Status

Current reason a new site may not appear on Google yet:
- the website is new
- it may not be indexed yet
- Google Search Console submission has not been completed
- there is currently no dedicated sitemap file in the public app

Recommended SEO next steps:
- add `robots.txt`
- add `sitemap.xml`
- connect Google Search Console
- submit the live domain for indexing
- add stronger per-page SEO metadata later

## Deployment Checklist

1. Push code to GitHub
2. Ensure Vercel environment variables are set
3. Redeploy Vercel
4. Confirm Supabase auth and tables are working
5. Test storefront from a different device
6. Test dashboard login and order visibility

## Operational Test Checklist

- Login works
- Theme selection persists
- Store name and branding persist across devices
- Products and categories appear on storefront
- Add to cart works
- Checkout form opens
- Website order saves
- WhatsApp order opens correctly
- Dashboard receives orders
- Order tracking works
- Social links render
- Trust features render

## Recommended Future Improvements

- Google Search Console field in dashboard
- `robots.txt`
- `sitemap.xml`
- SEO metadata per product/category/page
- server-side secure admin actions for sensitive operations
- storage bucket integration for all uploaded media if not already completed end-to-end
- role-based multi-admin support
- discount and coupon system
- shipping rule system

## Repository

- GitHub: `https://github.com/devsfolk/OmniStore`

