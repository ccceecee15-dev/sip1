# Overview

MERCHX is a retail planning and analytics dashboard application designed for inventory management, sales planning, and stock allocation. The application provides tools for two primary modules:

- **Store Inventory Planning (SIP)**: Handles allocation views, event uplift management (with uplift index model and seasonality charts), forecast generation, and vendor views
- **Range Assortment Planning (RAP)**: Manages store grading (by merchandise area), grading size (SKU counts and fixture types per grade), range styling (style grade assignment with exceptions), and facings & presentation (store-driven fixture-based capacity planning)

The application uses static mock data for UI development and is structured as a single-page application with a glassmorphism design system. It is currently a UI-only prototype — no live backend API calls are made; all data comes from static JSON and mock services.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing (not React Router)
- Single-page application (SPA) architecture
- Path aliases: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

**UI Design System**
- Glassmorphism design with backdrop blur effects throughout
- Dark blue primary accent color (HSL: 220 70% 15%)
- Radix UI primitives for accessible, unstyled component foundations
- Tailwind CSS v4 for utility-first styling with custom theme variables
- shadcn/ui component library (New York style) with custom glassmorphism overrides
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
- `/rap/range-style` — Range Style (assign style grades with exception handling)
- `/rap/style-exceptions` — Style Exception Management
- `/rap/facings-presentation` — Determine Facings & Presentation (store-first flow: select store, then define facings/depth per style)
- Placeholder routes exist for `/sip/rules` and `/rap/rules`

**Screen Interaction Patterns**
- Many screens use a mandatory entry condition pattern: screen loads empty with a placeholder message until required selectors (e.g., Merchandise Area, Store) are chosen
- Store selection views use table-based lists with filters for Format, Channel, Region, Property, Terminal
- Detail views show editable tables or charts scoped to the selected context
- Charts use Recharts library for data visualization (line charts, bar charts, sparklines)

**Data Handling**
- Static mock data in JSON files under `client/src/data/` (products, stores, time buckets)
- Mock service layer in `client/src/services/mockService.ts` with simulated network delays
- Inline mock data generators in page components for screen-specific data
- No live backend API calls — all data is client-side only
- React Query (`@tanstack/react-query`) is configured but primarily used for potential future API integration

## Backend Architecture

**Server Framework**
- Express.js with TypeScript
- Two entry points: `server/index-dev.ts` (development with Vite HMR middleware) and `server/index-prod.ts` (production with static file serving)
- Additional `server/index.ts` and `server/app.ts` variants exist (the project has been iterated on)
- Request logging middleware for `/api` routes
- Routes registered in `server/routes.ts` — currently minimal (no real API endpoints)

**Database Layer**
- Drizzle ORM configured for PostgreSQL (Neon serverless compatible)
- Schema defined in `shared/schema.ts` — currently only has a `users` table (id, username, password)
- `drizzle-kit` configured for schema push (`db:push` script)
- `MemStorage` class in `server/storage.ts` provides in-memory storage as a fallback
- Database is not actively used by the frontend — the app runs entirely on mock data

**Build & Scripts**
- `dev`: Runs development server with Vite HMR via `tsx server/index-dev.ts`
- `build`: Vite builds client, esbuild bundles server
- `start`: Runs production build
- `db:push`: Pushes Drizzle schema to PostgreSQL

## Project Structure Notes

The repository has a deeply nested structure with multiple copies/iterations:
- `v91mxzipzip/v91mxzip/v91mx/almost/screensOneBzipzip/` — This appears to be the main working directory containing all source code
- Multiple `replit.md` files exist at different nesting levels
- `attached_assets/` directories contain design specification text files that describe intended screen behaviors

# External Dependencies

**UI & Component Libraries**
- Radix UI (full suite of primitives: dialog, select, tabs, tooltip, accordion, etc.)
- shadcn/ui components (built on Radix UI)
- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- `class-variance-authority` and `clsx` for component variant styling
- `cmdk` for command palette functionality
- `embla-carousel-react` for carousel components
- `date-fns` for date formatting
- `next-themes` for theme switching
- Recharts (via `recharts`) for charts and data visualization
- Lucide React for icons

**State & Data**
- `@tanstack/react-query` for async state management (configured but minimal use)
- `react-hook-form` with `@hookform/resolvers` and `zod` for form validation
- `drizzle-zod` for schema-to-validation integration

**Server & Database**
- Express.js for the HTTP server
- `@neondatabase/serverless` for Neon PostgreSQL connectivity
- `drizzle-orm` with `drizzle-kit` for database ORM and migrations
- `pg` (node-postgres) for PostgreSQL connection pooling
- `connect-pg-simple` for session storage (configured but not actively used)

**Build Tools**
- Vite with `@vitejs/plugin-react`
- esbuild for server bundling
- TypeScript with strict mode
- `@replit/vite-plugin-runtime-error-modal` for development error overlay
- Custom `vite-plugin-meta-images` for OpenGraph image meta tags

**Fonts**
- Inter (loaded from Google Fonts CDN)