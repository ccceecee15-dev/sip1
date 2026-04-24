# Overview

MERCHX is a retail planning and analytics dashboard application designed for inventory management, sales planning, and stock allocation. It serves two primary modules:

- **Store Inventory Planning (SIP)**: Allocation views, event uplift management (uplift index model with seasonality charts), forecast generation, and vendor views
- **Range Assortment Planning (RAP)**: Store grading (by merchandise area), grading size (SKU counts and fixture types per grade), range styling (style grade assignment with exceptions), and facings/presentation (store-driven fixture capacity planning)

The application is currently a **UI-only prototype** using static mock data. There is no live backend API consumption — all data is simulated client-side. The codebase has a deeply nested directory structure due to iterative zipped versions; the actual working application lives in `v92zip/v92/v91mxzipzip/v91mxzip/v91mx/almost/screensOneBzipzip/`.

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
- `/rap/range-style` — Range Style (assign grades to styles with exception management)
- `/rap/facings-presentation` — Determine Facings & Presentation (store-driven fixture capacity)

**Data Handling**
- Static mock data in JSON files under `client/src/data/` (products, stores, time buckets)
- Mock service layer in `client/src/services/mockService.ts`
- No live backend API calls — UI-only development with simulated data
- All filter options, table rows, and chart data are generated client-side

## Backend Architecture

**Server Framework**
- Express.js with TypeScript
- Separate development and production entry points (`server/index-dev.ts`, `server/index-prod.ts`)
- Vite middleware integration for development HMR
- The server currently serves the SPA and has minimal API routes

**Database Layer**
- Drizzle ORM configured for PostgreSQL (Neon serverless compatible)
- Schema defined in `shared/schema.ts` — currently minimal (users table only)
- Drizzle Kit for migrations (`drizzle.config.ts`)
- Database is provisioned but not actively used by the UI — the app runs entirely on mock data

**Storage**
- In-memory storage implementation (`MemStorage` class in `server/storage.ts`)
- IStorage interface defined for future database-backed implementation
- Currently only supports basic user CRUD operations

## Project Structure Notes

The repository contains multiple nested directories from iterative development. The canonical working codebase is at:
```
v92zip/v92/v91mxzipzip/v91mxzip/v91mx/almost/screensOneBzipzip/
```
This directory contains the full `client/`, `server/`, `shared/`, and config files. When making changes, work within this directory structure.

# External Dependencies

**UI Component Libraries**
- Radix UI (full suite: dialog, select, tabs, tooltip, popover, accordion, etc.)
- shadcn/ui components built on Radix primitives
- Lucide React for icons
- class-variance-authority + clsx + tailwind-merge for className utilities
- cmdk for command palette
- embla-carousel-react for carousel components
- next-themes for theme management
- Recharts for data visualization (charts)

**State & Data Management**
- @tanstack/react-query for async state management (configured but minimally used since data is mocked)
- React Hook Form + @hookform/resolvers for form handling
- Zod for schema validation
- drizzle-zod for Drizzle-to-Zod schema generation

**Backend & Database**
- Express.js as the HTTP server
- Drizzle ORM with PostgreSQL dialect
- @neondatabase/serverless for database connection
- connect-pg-simple for session storage (configured but not actively used)

**Build & Dev Tools**
- Vite with @vitejs/plugin-react
- @tailwindcss/vite plugin for Tailwind CSS v4
- esbuild for server bundling
- tsx for TypeScript execution
- @replit/vite-plugin-runtime-error-modal for development error overlay
- Custom `vite-plugin-meta-images` for OpenGraph image handling