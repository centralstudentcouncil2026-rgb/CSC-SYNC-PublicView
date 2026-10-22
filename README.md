# CSC SYNC Student

Standalone student application. Serve `index.html` from this repository root.
Shared JavaScript, styles and images are copied locally; no sibling repository is required.

## Local use

Run `npm run dev`, then open http://127.0.0.1:5173/.
Run `npm run check` to validate local imports and assets.
No dependency installation or build is required. Static hosting can publish the repository root.

## Database

Uses the existing shared CSC SYNC Supabase project and its public client key.
No private credentials are included. Access is enforced by database policies.

The Student app calls only the approved-public calendar and organizer-contact RPCs.
Its SQL files update those RPCs on an existing CSC SYNC schema; use the Admin repository for full schema setup.
