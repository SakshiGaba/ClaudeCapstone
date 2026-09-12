# My App

A simple full-stack project:
- **Frontend:** React
- **Backend:** Node.js + Express
- **Database:** SQLite
- **Testing:** Playwright
- **Build/Scripts:** npm

## Project structure

```
my-app/
├── client/          # React frontend (create-react-app style)
├── server/          # Express backend
│   ├── db/          # SQLite database file is created here at runtime
│   └── scripts/
│       └── load-test.js  # Seeds 10k items and times GET /api/items (see below)
├── tests/           # Playwright end-to-end tests
├── playwright.config.js
└── package.json     # root scripts to run everything together
```

## Setup

From the project root, install all dependencies (root, server, and client):

```bash
npm run install-all
```

This runs `npm install` in the root, `server/`, and `client/` folders.

If you'd rather do it manually:

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

## Running the app

Start both the backend (port 5000) and frontend (port 3000) together:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/items

The SQLite database file is created automatically at `server/db/app.db` the first time the server runs.

### Running them separately

```bash
npm run server   # starts Express with nodemon (auto-restart)
npm run client   # starts React dev server
```

## Running tests (Playwright)

Install browsers once (first time only):

```bash
npx playwright install
```

Run the test suite:

```bash
npm test
```

Playwright's config (`playwright.config.js`) is set up to automatically start both the server and client for you before running tests, so you don't need to have `npm run dev` running separately. It will reuse them if they're already running.

To view a visual HTML report of the last test run:

```bash
npx playwright show-report
```

### Load testing

With the server running (`npm run server` or `npm run dev`), verify
`GET /api/items` stays under 200ms at 10,000 items:

```bash
node server/scripts/load-test.js
```

Seeds the database directly (bypassing the API, so seeding speed doesn't
affect the measured numbers) and prints average/max response times for
both a filtered and unfiltered request, exiting non-zero if either exceeds
the threshold.

## API endpoints

| Method | Endpoint                        | Description                                                                 |
|--------|----------------------------------|-------------------------------------------------------------------------------|
| GET    | /api/health                     | Health check                                                                   |
| GET    | /api/items                      | List all items                                                                 |
| GET    | /api/items?category=&lt;value&gt;   | List items filtered to `<value>`, case-insensitive (e.g. `Fruit` matches `fruit`) |
| POST   | /api/items                      | Add a new item. Body: `{ "name": string, "category"?: string }`. `category` is optional — blank/whitespace-only defaults to `"Uncategorized"`; max 50 characters after trimming. |
| DELETE | /api/items/:id                  | Delete an item                                                                 |

### Item shape

```json
{ "id": 1, "name": "Apples", "category": "Fruit" }
```

`category` defaults to `"Uncategorized"` if omitted. Matching (for filtering) is
case-insensitive, but the value is stored and returned with its original casing.

## Building for production

Build the React frontend into static files:

```bash
cd client
npm run build
```

The output goes to `client/build/`. You can then serve it with any static file server, or configure Express to serve it directly (add `express.static` in `server/index.js` pointing at `../client/build`).
