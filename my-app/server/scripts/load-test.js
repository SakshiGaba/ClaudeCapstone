const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'app.db');
const TARGET_ITEM_COUNT = 10000;
const CATEGORIES = [
  'Fruit',
  'Tools',
  'Electronics',
  'Books',
  'Clothing',
  'Toys',
  'Sports',
  'Garden',
  'Office',
  'Uncategorized',
];
const FILTER_CATEGORY = CATEGORIES[0];
const RESPONSE_THRESHOLD_MS = 200;
const REQUEST_REPEATS = 5;
const BASE_URL = process.env.LOAD_TEST_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

const db = new sqlite3.Database(DB_PATH);

// Mirrors the startup migration in server/index.js so this script is safe to
// run standalone against a fresh DB, without duplicating the server process.
function ensureSchema() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )`,
        (err) => {
          if (err) return reject(err);
        }
      );

      const createIndex = () => {
        db.run(
          'CREATE INDEX IF NOT EXISTS idx_items_category_lower ON items (LOWER(category))',
          (err) => (err ? reject(err) : resolve())
        );
      };

      db.all('PRAGMA table_info(items)', [], (err, columns) => {
        if (err) return reject(err);
        const hasCategory = columns.some((col) => col.name === 'category');
        if (hasCategory) {
          createIndex();
        } else {
          db.run(
            `ALTER TABLE items ADD COLUMN category TEXT NOT NULL DEFAULT 'Uncategorized'`,
            (err) => (err ? reject(err) : createIndex())
          );
        }
      });
    });
  });
}

function countItems() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS count FROM items', [], (err, row) => {
      if (err) return reject(err);
      resolve(row.count);
    });
  });
}

// Seeds directly against SQLite, bypassing the API, so seed speed doesn't
// factor into the measured GET /api/items numbers below.
function seedItems(count) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare('INSERT INTO items (name, category) VALUES (?, ?)');
      for (let i = 0; i < count; i++) {
        stmt.run(`Load Test Item ${i}`, CATEGORIES[i % CATEGORIES.length]);
      }
      stmt.finalize((err) => {
        if (err) return reject(err);
        db.run('COMMIT', (err) => (err ? reject(err) : resolve()));
      });
    });
  });
}

async function timedFetch(url) {
  const start = process.hrtime.bigint();
  const res = await fetch(url);
  const body = await res.json();
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { status: res.status, count: Array.isArray(body) ? body.length : null, ms };
}

async function timeEndpoint(label, url) {
  await timedFetch(url); // warm-up request, discarded (connection setup, JIT), not counted below

  const timings = [];
  let lastResult;
  for (let i = 0; i < REQUEST_REPEATS; i++) {
    lastResult = await timedFetch(url);
    if (lastResult.status !== 200) {
      throw new Error(`${label}: expected HTTP 200, got ${lastResult.status}`);
    }
    timings.push(lastResult.ms);
  }
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  const max = Math.max(...timings);
  console.log(
    `${label}: ${lastResult.count} rows, ${REQUEST_REPEATS} requests — ` +
      `avg ${avg.toFixed(2)}ms, max ${max.toFixed(2)}ms ` +
      `(individual: ${timings.map((t) => t.toFixed(2)).join(', ')} ms)`
  );
  return { avg, max };
}

async function main() {
  await ensureSchema();

  const existing = await countItems();
  const toSeed = Math.max(0, TARGET_ITEM_COUNT - existing);
  console.log(`Existing items in ${DB_PATH}: ${existing}`);
  if (toSeed > 0) {
    console.log(`Seeding ${toSeed} more item(s) directly against SQLite to reach ${TARGET_ITEM_COUNT}...`);
    await seedItems(toSeed);
  } else {
    console.log(`Target of ${TARGET_ITEM_COUNT} items already reached; skipping seeding.`);
  }
  const total = await countItems();
  console.log(`Total items in table: ${total}`);
  db.close();

  console.log(`\nTiming against ${BASE_URL} (server must already be running)...\n`);

  const unfiltered = await timeEndpoint('GET /api/items (unfiltered)', `${BASE_URL}/api/items`);
  const filtered = await timeEndpoint(
    `GET /api/items?category=${FILTER_CATEGORY} (filtered)`,
    `${BASE_URL}/api/items?category=${encodeURIComponent(FILTER_CATEGORY)}`
  );

  console.log(`\nNFR-1 threshold: < ${RESPONSE_THRESHOLD_MS}ms per response, table size ${total}.`);

  const failures = [];
  if (unfiltered.avg >= RESPONSE_THRESHOLD_MS) {
    failures.push(`Unfiltered average ${unfiltered.avg.toFixed(2)}ms >= ${RESPONSE_THRESHOLD_MS}ms`);
  }
  if (filtered.avg >= RESPONSE_THRESHOLD_MS) {
    failures.push(`Filtered average ${filtered.avg.toFixed(2)}ms >= ${RESPONSE_THRESHOLD_MS}ms`);
  }

  if (failures.length > 0) {
    console.error('\nNFR-1 FAILED:');
    failures.forEach((f) => console.error(` - ${f}`));
    process.exitCode = 1;
  } else {
    console.log('\nNFR-1 PASSED: both unfiltered and filtered queries averaged under the threshold.');
  }
}

main().catch((err) => {
  console.error('Load test failed:', err);
  db.close();
  process.exitCode = 1;
});
