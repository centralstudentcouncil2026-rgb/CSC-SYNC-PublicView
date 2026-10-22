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


## Public feedback (migration 043)

Apply `database/migrations/043_public_feedback.sql` in the shared Supabase project once. Student View has a responsive About icon and a Concern / Thought / Idea form. Submissions appear in Admin Concerns with optional visitor name and contact details, using the existing progress controls. Anonymous visitors can submit through the RPC but cannot read concerns. Drafts survive reloads; retries reuse a request ID to avoid duplicate submissions. A browser-level one-minute cooldown and a hidden bot field reduce repeated submissions.


## Shared notices and blocked dates

Errors use the same dismissible notice card above all open dialogs. In Admin and Org calendars, timed blocks share schedule-strip lanes and all-day blocks shade the date light red. Selecting a blocked date or range shows a notice before opening the form; partially blocked single dates offer an available time. Existing schedules remain viewable, and the block creator retains the existing scheduling exemption. Database migration 042 still enforces conflicts, including recurring schedules. This UI update requires no additional SQL.
