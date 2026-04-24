# Overview

MERCHX is a retail planning and analytics dashboard application designed for inventory management, sales planning, and stock allocation. It serves two primary modules:

- **Store Inventory Planning (SIP)**: Allocation views, event uplift management (uplift index model with seasonality charts), forecast generation, and vendor views
- **Range Assortment Planning (RAP)**: Store grading (by merchandise area), grading size (SKU counts and fixture types per grade), range styling (style grade assignment with exceptions), and facings/presentation (store-driven fixture-based capacity planning)

The application is currently a **UI-only prototype** using static mock data. There is no live backend API consumption — all data is simulated client-side. The codebase lives primarily in the nested directory `v92/v91mxzipzip/v91mxzip/v91mx/almost/screensOneBzipzip/`.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing (not React Router)
- Single-page application (SPA) architecture
- Path aliases: `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`

**UI Design System**
- Glassmorphism design with backdrop blur effects throughout
- Dark blue primary accent color (HSL: 220 70% 15%)
- Radix UI primitives for accessible, unstyled component foundations
- Tailwind CSS v4 for utility-first styling with custom theme variables defined in `client/src/index.css`
- shadcn/ui component library (New York style) configured via `components.json` with custom glassmorphism overrides
- Custom CSS classes used widely: `.glass`, `.glass-card`, `.glass-sidebar`, `.glass-header`
- Inter font family loaded from Google Fonts
- Light theme is the default; dark mode supported via `next-themes`

**Key Layout Components**
- `MainLayout`: Wraps all pages with Sidebar, Header, and navigation chrome
- `Sidebar`: Collapsible navigation with nested menu items organized under SIP and RAP modules
- `CompactFilterBar`: Reusable horizontal inline filter layout used across all planning screens — supports expand/collapse for many filters
- `Card` components with glass effect styling for content containers
- `PlaceholderPage`: Used for screens not yet implemented
- Tables use shadcn/ui Table components with custom hover/styling

**Routing Structure**
- `/` redirects to `/sip/allocation`
- `/sip/allocation` — Allocation View (with SKU detail drill-down at `/sip/allocation/:skuId`)
- `/sip/event-uplift` — Manage Event Uplift (store selection → uplift index chart with baseline, adjusted, and event highlight lines)
- `/sip/forecast` — Generate Forecast (configuration + trigger UI)
- `/sip/vendor` — Vendor View (vendor-level roll-up, read-only)
- `/rap/grading-size` — Determine Grading Size (SKU count and fixture types per store grade)
- `/rap/grade-store` — Grade Store (assign store grades per merchandise area)
- `/rap/range-style` — Range Styling (style grade assignment with exceptions)
- `/rap/facings-presentation` — Determine Facings & Presentation (store-driven fixture-based capacity planning)
- `/rap/style-exceptions` — Style Exception Management
- Placeholder routes for future SIP/RAP rules screens

**Data Handling**
- Static mock data in JSON files under `client/src/data/` (products, stores, time buckets)
- Mock service layer in `client/src/services/mockService.ts`
- No live backend API calls — UI-only development with simulated data
- Some pages generate mock data inline using random number generation

**State Management**
- React local state (useState) for page-level state
- TanStack React Query configured but primarily used for future API integration
- No global state management library (no Redux, Zustand, etc.)

## Backend Architecture

**Server Framework**
- Express.js with TypeScript
- Separate development and production entry points (`server/index-dev.ts` with Vite HMR middleware, `server/index-prod.ts` for static serving)
- Additional `server/index.ts` as a unified entry point
- Routes registered in `server/routes.ts` (currently minimal — no application routes implemented)
- Vite middleware integration for development hot module replacement via `server/vite.ts`

**Database Layer**
- Drizzle ORM for database operations with PostgreSQL (Neon serverless compatible)
- Database configuration in `drizzle.config.ts` requiring `DATABASE_URL` environment variable
- Schema defined in `shared/schema.ts` — currently minimal with only a `users` table
- Storage layer abstraction in `server/storage.ts` with `MemStorage` (in-memory) implementation
- Database connection via `server/db.ts` using `pg.Pool`

**Build & Deployment**
- Vite builds client to `dist/public/`
- esbuild bundles server to `dist/index.js`
- Custom build script in `script/build.ts` with dependency bundling allowlist
- Replit-specific plugins: runtime error overlay, cartographer, dev banner, meta images

## Important Structural Note

The active codebase is nested deeply: `v92/v91mxzipzip/v91mxzip/v91mx/almost/screensOneBzipzip/`. This appears to be the result of iterative zip extractions. The root `v92/` directory only has a minimal `package.json` with `tsx` as a dependency. All meaningful application code (client, server, shared, config files) lives in the deeply nested directory.

# External Dependencies

**Frontend Libraries**
- React 18+ and ReactDOM
- Wouter (client-side routing)
- TanStack React Query (data fetching, currently minimal use)
- Radix UI (full suite of primitives: dialog, dropdown, select, tabs, toast, tooltip, etc.)
- shadcn/ui components (built on Radix + Tailwind)
- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- `class-variance-authority` and `clsx`/`tailwind-merge` for styling utilities
- `cmdk` for command palette
- `date-fns` for date formatting
- `embla-carousel-react` for carousels
- `next-themes` for theme management
- `react-hook-form` with `@hookform/resolvers` and Zod validation
- `recharts` for charting (used in uplift/seasonality visualization)
- `lucide-react` for icons
- `sonner` for toast notifications

**Backend Libraries**
- Express.js
- Drizzle ORM with `drizzle-zod` for schema validation
- `@neondatabase/serverless` for PostgreSQL connection
- `pg` (node-postgres) for connection pooling
- `connect-pg-simple` for session storage
- `nanoid` for ID generation
- Zod for runtime validation

**Build Tools**
- Vite with React plugin
- esbuild for server bundling
- TypeScript
- PostCSS with autoprefixer
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer` (dev only)
- `@replit/vite-plugin-dev-banner` (dev only)

**Database**
- PostgreSQL (expected via `DATABASE_URL` environment variable)
- Neon serverless compatible
- Currently only a `users` table in the schema — the application does not yet read/write planning data from the database