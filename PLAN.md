# TodayTable PoC Plan

## Product Goal

TodayTable helps users record meals every day, review eating patterns from a health-management perspective, and use those records to improve their habits over time.

## PoC Direction

- Build a pnpm-based monorepo so the web app, domain logic, and infrastructure adapters can evolve independently.
- Start with a Next.js application in `apps/web`.
- Keep server-side business logic in package-level modules using hexagonal architecture.
- Use Firebase Storage for the first persistence adapter.
- Use SQLite for local PoC development until Firebase project configuration is ready.
- Design the persistence boundary as a port so it can later move from Firebase Storage to an RDB implementation without changing application use cases.
- Use Google authentication through Firebase Authentication.
- Use mock username authentication for local PoC development until Firebase Authentication is configured.
- Build app screens with Tailwind CSS and shadcn/ui.
- Keep the current client as Next.js, while leaving room to move later to:
  - React SPA + backend
  - React Native client + shared backend

## Architecture

- `apps/web`: Next.js UI and route handlers. This layer handles HTTP, browser state, and Firebase client authentication.
- `packages/core`: domain models, application services, and ports. This package does not import Firebase, Next.js, or database SDKs.
- `packages/firebase-storage`: adapter package that implements `packages/core` ports with Firebase Admin SDK and Firebase Storage.
- `packages/sqlite`: local development adapter that implements `packages/core` persistence ports with SQLite.

## Initial Scope

- Google sign-in.
- Record a meal with type, time, food items, optional note, tags, and mood.
- Meal type is one of breakfast, lunch, dinner, or snack.
- List recent meal records for the signed-in user.
- Store each meal entry as JSON under a user-scoped Firebase Storage path.

## Later Changes Expected

- Replace Firebase Storage meal persistence with an RDB adapter.
- Split Next.js route handlers into a dedicated backend service when SPA and React Native clients need the same API.
- Add richer food and nutrition analysis once the recording flow is stable.
