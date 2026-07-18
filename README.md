# Bella & Guy Salon

Booking and business management platform for Bella & Guy, a unisex salon offering
at-salon and home-service appointments in Wave City, Ghaziabad.

## Overview

The application serves three audiences from a single Next.js codebase:

- **Public site** — service catalog, individual service detail pages, gallery,
  reviews, and a multi-step home-service booking flow.
- **Customer account** — self-service booking history and profile management
  behind Supabase Auth.
- **Staff admin panel** — appointment management, staff scheduling, customer
  inquiries, revenue reporting, and site settings, gated behind a separate
  authenticated role check.

## Tech Stack

| Layer          | Technology                                |
| -------------- | ------------------------------------------ |
| Framework      | Next.js 16 (App Router)                    |
| Language       | TypeScript, React 19                       |
| Styling        | Tailwind CSS v4 + component-scoped CSS      |
| Data / Auth    | Supabase (Postgres, Auth, Row Level Security) |
| Animation      | Framer Motion                              |
| Charts         | Recharts                                   |
| Email          | Resend                                     |
| Messaging      | WhatsApp Cloud API                         |
| PDF export     | jsPDF + jspdf-autotable                    |
| Deployment     | Netlify (`@netlify/plugin-nextjs`)         |

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project

### Installation

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase, Resend, and WhatsApp credentials (see
[Environment Variables](#environment-variables) below).

### Database Setup

Run the SQL files in `supabase/` against your Supabase project's SQL Editor,
in addition to the core `appointments`, `contacts`, and `staff` tables managed
directly in the Supabase dashboard:

- `supabase/inquiries.sql` — customer inquiry submissions and admin management
- `supabase/settings.sql` — site-wide configurable settings (contact info,
  WhatsApp defaults, booking rules)

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable                     | Required | Purpose                                      |
| ----------------------------- | -------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`    | Yes      | Supabase project URL                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes    | Supabase anonymous/public API key             |
| `RESEND_API_KEY`              | Yes      | Transactional email delivery                  |
| `ADMIN_EMAIL`                 | Yes      | Recipient for new-booking email notifications |
| `WHATSAPP_ACCESS_TOKEN`       | Optional | WhatsApp Cloud API access token               |
| `WHATSAPP_PHONE_NUMBER_ID`    | Optional | WhatsApp Cloud API sender phone number ID     |
| `OWNER_WHATSAPP_PHONE`        | Optional | Fallback WhatsApp number for owner notifications |

Business-facing values (displayed phone number, address, hours, WhatsApp
default message, minimum booking value, Instagram link) are configured at
runtime through the admin panel's Settings tab rather than environment
variables, and are stored in the `settings` table.

## Folder Structure

```
app/                    Next.js App Router routes
  api/                   Server route handlers (email, WhatsApp notifications)
  book/                  Multi-step booking flow
  services/[category]/[slug]/  Individual service detail pages
  my-bookings/           Customer account area
  bg-secure-4x9k/        Staff admin panel
  login/, customer-login/, reset-password/  Authentication flows
components/              Shared UI components
lib/                     Supabase clients, service catalog data, settings access
supabase/                SQL migrations for admin-managed tables
public/images/           Static and product imagery
```

## Deployment

The project deploys to Netlify via `@netlify/plugin-nextjs` (see
`netlify.toml`). Set the same environment variables listed above in the
Netlify site configuration before deploying.

## Security Notes

- All API credentials are read from environment variables; none are
  committed to the repository.
- Supabase Row Level Security policies restrict write access on
  `inquiries` and `settings` to authenticated staff sessions, while
  allowing public read/insert only where the public site requires it.
- The admin panel is served from an unlisted route and additionally
  verifies the authenticated user against a `staff` table before granting
  access.
