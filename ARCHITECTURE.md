# TodayTable Architecture

## Current Decision

TodayTable starts as a pnpm monorepo with a Next.js app and package-level business logic. The current PoC uses Next.js for both UI and HTTP route handlers, but the core logic is intentionally separated so it can later move behind a dedicated backend for React SPA and React Native clients.

Local PoC development uses SQLite and mock username authentication. Initial service deployment is expected to use Firebase Storage and Firebase Authentication.

The primary architecture style is hexagonal architecture:

- Domain and use cases define the application behavior.
- Ports define required external capabilities.
- Adapters implement those ports with concrete infrastructure.
- The app layer wires HTTP, authentication state, and concrete adapters together.

## Package Layout

```txt
apps/
  web/
    app/
    components/
    lib/

packages/
  core/
    src/domain/
    src/application/ports/
    src/application/use-cases/

  firebase-storage/
    src/

  sqlite/
    src/
```

## Dependency Direction

```txt
apps/web
  -> packages/core
  -> packages/firebase-storage
  -> packages/sqlite

packages/firebase-storage
  -> packages/core

packages/sqlite
  -> packages/core

packages/core
  -> no Next.js, Firebase, React, HTTP, or database dependency
```

This dependency direction is the most important rule. `packages/core` must remain independent from frameworks and infrastructure SDKs.

## Package Responsibilities

### `apps/web`

`apps/web` is the current delivery mechanism.

Responsibilities:

- Render the Next.js UI.
- Build screens with Tailwind CSS and shadcn/ui.
- Handle browser-side Firebase Google sign-in.
- Handle local mock username sign-in during PoC development.
- Send Firebase ID tokens to server route handlers.
- Expose HTTP endpoints through Next.js route handlers.
- Compose use cases with concrete adapters.

Current files of interest:

- `app/page.tsx`: page entry.
- `components/meal-journal.tsx`: PoC meal recording UI.
- `app/api/meals/route.ts`: HTTP API for listing and recording meals.
- `lib/server-deps.ts`: composition root for use cases and adapters.
- `lib/firebase-client.ts`: browser Firebase client initialization.

This layer can be replaced later by:

- React SPA calling a separate backend.
- React Native client calling the same backend.
- A backend framework such as Fastify, Hono, NestJS, Firebase Functions, or Cloud Run.

### `packages/core`

`packages/core` owns business rules and application behavior.

Responsibilities:

- Domain models, such as `MealEntry`, `FoodItem`, and `MealMood`.
- Meal type values: `breakfast`, `lunch`, `dinner`, `snack`.
- Domain creation and normalization logic.
- Application use cases, such as `RecordMealUseCase` and `ListMealsUseCase`.
- Ports, such as `MealEntryRepository` and `AuthTokenVerifier`.

Rules:

- Do not import Next.js.
- Do not import React.
- Do not import Firebase SDKs.
- Do not import database SDKs.
- Do not depend on HTTP request/response types.
- Keep inputs and outputs plain TypeScript data structures.

This package should be usable from any future backend process without changes.

### `packages/firebase-storage`

`packages/firebase-storage` is an infrastructure adapter package for the PoC.

Responsibilities:

- Implement `MealEntryRepository` using Firebase Storage.
- Store meal entries as user-scoped JSON objects.
- Verify Firebase ID tokens using Firebase Admin SDK.
- Hide Firebase Admin initialization from app code.

Current storage shape:

```txt
meal-entries/{encodedUserId}/{mealEntryId}.json
```

This package depends on `packages/core` because it implements core ports. `packages/core` must not depend on this package.

### `packages/sqlite`

`packages/sqlite` is the local development persistence adapter.

Responsibilities:

- Implement `MealEntryRepository` using SQLite.
- Store local PoC data in `data/today-table.local.db` by default.
- Provide RDB-like query behavior before PostgreSQL or another production RDB is introduced.
- Keep local development unblocked while Firebase project configuration is not ready.

This package is for local PoC development. It should remain replaceable by Firebase Storage or a production RDB adapter.

## Current Request Flow

### Record Meal

```txt
Browser UI
  -> Mock username or Firebase Google sign-in
  -> x-mock-username header or Firebase ID token
  -> POST /api/meals
  -> Mock auth or FirebaseAuthTokenVerifier
  -> RecordMealUseCase
  -> MealEntryRepository port
  -> SQLiteMealEntryRepository or FirebaseStorageMealEntryRepository
  -> SQLite row or Firebase Storage JSON object
```

### List Meals

```txt
Browser UI
  -> x-mock-username header or Firebase ID token
  -> GET /api/meals
  -> Mock auth or FirebaseAuthTokenVerifier
  -> ListMealsUseCase
  -> MealEntryRepository port
  -> SQLiteMealEntryRepository or FirebaseStorageMealEntryRepository
  -> SQLite rows or Firebase Storage JSON objects
```

## Backend Migration Path

When moving from Next.js route handlers to a dedicated backend:

1. Create a backend app or package, for example `apps/backend`.
2. Move HTTP routes from `apps/web/app/api/*` into the backend.
3. Keep `packages/core` unchanged.
4. Reuse `packages/firebase-storage` initially.
5. Move `lib/server-deps.ts` style wiring into the backend composition root.
6. Change `apps/web` into a frontend-only client that calls the backend API.
7. Let React Native call the same backend API.

Expected future dependency direction:

```txt
apps/web
  -> packages/api-contracts

apps/mobile
  -> packages/api-contracts

apps/backend
  -> packages/core
  -> packages/firebase-auth
  -> packages/sqlite for local development
  -> packages/postgres or packages/firebase-storage
  -> packages/api-contracts
```

## Future Implementation Tasks

- Add request/response validation schemas.
- Add an `api-contracts` package shared by web, mobile, and backend.
- Split Firebase authentication from Firebase Storage if the code grows.
- Add an RDB adapter package, for example `packages/postgres`.
- Add migrations if SQLite evolves beyond the current local PoC schema.
- Add repository tests for Firebase Storage behavior.
- Add use case unit tests in `packages/core`.
- Add API route tests once the backend boundary stabilizes.
- Add explicit error types instead of throwing generic `Error`.
- Add pagination support to meal listing.
- Add update and delete meal use cases.
- Add meal analysis use cases after the recording flow is stable.
- Add CI commands for install, typecheck, build, and tests.

## RDB Migration Considerations

The current local SQLite adapter gives the project an RDB-like development path before Firebase is configured. The Firebase Storage adapter is still acceptable for initial service deployment if the product only needs simple user-scoped meal records.

Firebase Storage is acceptable now because:

- Meal entries can be stored as simple JSON documents.
- The app only needs create and recent-list behavior.
- It minimizes early database modeling decisions.

SQLite is useful during local PoC because:

- It does not require Firebase credentials.
- It supports date ordering and future filters naturally.
- It keeps repository behavior close to a future RDB adapter.

An RDB should be introduced when the product needs:

- Filtering by date range, tag, meal type, or health goal.
- Aggregation by week, month, food category, or nutrition attributes.
- Transactional updates.
- Data consistency constraints.
- Efficient pagination and indexing.
- Cross-user or cohort-level analytics.

The intended migration is adapter replacement:

```ts
// PoC
new RecordMealUseCase(new SQLiteMealEntryRepository());

// Initial service
new RecordMealUseCase(new FirebaseStorageMealEntryRepository());

// Later
new RecordMealUseCase(new PostgresMealEntryRepository());
```

Use cases should not change for this migration unless the product behavior itself changes.

## Authentication Considerations

Current decision:

- Local PoC uses mock authentication with a username as the user identifier.
- Initial service uses Firebase Authentication with Google provider.
- In Firebase mode, browser receives Firebase ID token.
- In Firebase mode, server verifies ID token through Firebase Admin SDK.
- Core receives only authenticated user identity, not Firebase token details.

Future considerations:

- Separate `FirebaseAuthTokenVerifier` into a dedicated `packages/firebase-auth` package if authentication logic grows.
- Define an application-level `UserIdentity` type if more providers are added.
- Keep authorization checks in use cases when they are business rules.
- Keep token parsing and provider-specific verification in adapters.

## API Contract Considerations

Current PoC uses route-local request parsing. This is acceptable for early validation, but it should not become the long-term API contract.

Before adding React Native or a separate SPA/backend split:

- Introduce shared schema definitions.
- Use schemas for runtime validation.
- Export TypeScript types from schemas.
- Version API contracts if mobile clients need backward compatibility.

Candidate package:

```txt
packages/api-contracts
```

Candidate tooling:

- `zod` for runtime schema validation.
- OpenAPI generation if external API documentation becomes useful.

## Testing Strategy

Recommended testing layers:

- `packages/core`: fast unit tests for domain normalization and use cases.
- Adapter packages: integration-style tests with Firebase emulator or test doubles.
- SQLite adapter: repository tests against a temporary database file.
- Backend/API: route tests for authentication, validation, and HTTP status behavior.
- Web app: component and end-to-end tests for login and meal recording flow.

The first tests to add should target `packages/core` because those rules should remain stable across frontend and backend changes.

## Open Design Questions

- Should meals be modeled as free-form food items first, or should food items become normalized entities early?
- Should meal records include nutrition estimates in the same aggregate or as separate analysis results?
- Should health goals belong in `packages/core` now or wait until the recording workflow is validated?
- Should Firebase Storage remain only a PoC adapter, or will it also be used for media uploads such as meal photos?
- Should the first backend be a small standalone HTTP service or Firebase Functions?

## Guardrails

- Keep `packages/core` framework-free.
- Add new infrastructure through ports and adapters.
- Keep app-level code responsible for transport and composition, not business rules.
- Prefer replacing adapters over rewriting use cases when infrastructure changes.
- Do not let Firebase-specific types leak into core domain or use case APIs.
- Use Tailwind CSS and shadcn/ui for UI implementation.
- Keep shadcn/ui project configuration in `apps/web/components.json`.
- Use mock authentication only for local PoC development, not production service deployment.
