# GUM - Crow Admin UI

GUM (formerly crow-admin-ui) is the web-based management interface for the Crow DNS server. Built with React, TypeScript, and AWS Cloudscape Design System.

## Overview

GUM provides a comprehensive web UI for managing Crow DNS server:

- **Dashboard**: Real-time metrics and server status
- **Zones**: DNS zone management (create, edit, delete)
- **Records**: DNS record management within zones
- **Health**: Health check monitoring and failover status
- **Firewall**: DNS firewall rules and blocklists
- **Analytics**: Query patterns, top clients, and NXDOMAIN analysis
- **Alerts**: Alert rules and notification configuration
- **Catalogs**: Catalog zone management (RFC 9432)
- **NTAs**: Negative Trust Anchors for DNSSEC
- **Users**: User account management with MFA support
- **Config**: Server configuration hot-reload

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

## Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The dev server will start at `http://localhost:5173` with hot module replacement.

### Type Checking

```bash
npm run typecheck
```

### Run Tests

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch
```

## Building for Production

To build the production bundle that gets embedded into crow-server:

```bash
npm run build
```

This generates optimized assets in the `dist/` directory, which crow-server embeds via `rust-embed`.

### Integration with Crow Server

The Crow DNS server at `../Crow` expects the built UI at:

```
/Users/johnewillmanv/projects/GUM/dist/
```

The path is configured in `crow-server/src/api/ui.rs`:

```rust
#[derive(Embed)]
#[folder = "../../projects/GUM/dist"]
struct UiAssets;
```

**Build workflow:**

1. Make changes to GUM source
2. Run `npm run build` to generate `dist/`
3. Rebuild crow-server to embed the new UI bundle
4. The UI is served at `http://localhost:8080/` (or your configured bind address)

## Project Structure

```
src/
├── api/           # API client and React Query hooks
├── components/    # Reusable UI components
├── pages/         # Page components (one per route)
├── providers/     # React context providers (Auth, Theme, WebSocket, etc.)
└── test/          # Test setup and utilities
```

## API Integration

GUM communicates with crow-server's REST API (default: `http://localhost:8080/api/v1/`).

Key endpoints:
- `/api/v1/zones` - Zone management
- `/api/v1/zones/{name}/records` - Record management
- `/api/v1/health/targets` - Health check status
- `/api/v1/firewall/policies` - Firewall rules
- `/api/v1/alerts/rules` - Alert configuration
- `/api/v1/analytics/top-queries` - Query analytics
- `/api/v1/catalogs` - Catalog zones
- `/api/v1/ntas` - Negative Trust Anchors
- `/api/v1/users` - User management
- `/api/v1/config/reload` - Hot-reload configuration

## Authentication

GUM uses Bearer token authentication. The login flow:

1. User submits credentials to `/api/v1/auth/login`
2. Server returns JWT token
3. Token stored in localStorage
4. All API requests include `Authorization: Bearer <token>` header

MFA (TOTP) is supported via `/api/v1/auth/mfa/setup` and `/api/v1/auth/mfa/verify`.

## WebSocket Real-Time Updates

GUM maintains a WebSocket connection (`ws://localhost:8080/ws`) for real-time notifications:

- Zone updates (NOTIFY, dynamic updates, AXFR/IXFR)
- Security alerts
- Health check state changes
- Alert trigger events

The `WebSocketProvider` handles automatic reconnection and message dispatch.

## Technology Stack

- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Cloudscape Design System** - AWS-style UI components
- **React Query (TanStack)** - Data fetching and caching
- **React Router 7** - Client-side routing
- **Vite 6** - Build tool and dev server
- **Vitest** - Unit testing
- **Testing Library** - Component testing

## Development Tips

### API Base URL

The API base URL is configured in `src/api/client.ts`. For local development, it defaults to `http://localhost:8080`.

### Theme Switching

GUM supports light/dark mode via the `ThemeProvider`. Toggle with the theme button in the top nav.

### Hot Module Replacement

Vite provides instant HMR during development. Changes to components, hooks, and providers update without full page reload.

### CORS During Development

If running GUM dev server separately from crow-server, you may need to configure CORS in crow-server to allow `http://localhost:5173`.

## License

Same license as Crow DNS server (see main repository).

## Repository Structure

GUM is maintained as a separate repository to:

1. Enable independent versioning
2. Simplify Node.js toolchain (no mixing with Rust builds)
3. Allow UI-only development without rebuilding Rust
4. Support future deployment scenarios (CDN-hosted UI, etc.)

The built assets are embedded into crow-server via `rust-embed` for single-binary deployment.
