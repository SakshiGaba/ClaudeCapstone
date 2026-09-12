const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(path.join(__dirname, 'db', 'app.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Fatal: failed to create items table:', err.message);
      process.exit(1);
    }
  });

  const createCategoryIndex = () => {
    db.run(
      'CREATE INDEX IF NOT EXISTS idx_items_category_lower ON items (LOWER(category))',
      (err) => {
        if (err) {
          console.error('Fatal: failed to create category index:', err.message);
          process.exit(1);
        }
      }
    );
  };

  db.all('PRAGMA table_info(items)', [], (err, columns) => {
    if (err) {
      console.error('Fatal: failed to read items table schema:', err.message);
      process.exit(1);
    }
    const hasCategory = columns.some((col) => col.name === 'category');
    if (hasCategory) {
      createCategoryIndex();
    } else {
      db.run(
        `ALTER TABLE items ADD COLUMN category TEXT NOT NULL DEFAULT 'Uncategorized'`,
        (err) => {
          if (err) {
            console.error('Fatal: failed to add category column:', err.message);
            process.exit(1);
          }
          createCategoryIndex();
        }
      );
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all items, optionally filtered by category
app.get('/api/items', (req, res) => {
  const { category } = req.query;
  if (category !== undefined && typeof category !== 'string') {
    return res.status(400).json({ error: 'Category must be a single string value' });
  }
  const sql = category !== undefined
    ? 'SELECT * FROM items WHERE LOWER(category) = LOWER(?) ORDER BY id DESC'
    : 'SELECT * FROM items ORDER BY id DESC';
  const params = category !== undefined ? [category] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new item
app.post('/api/items', (req, res) => {
  const { name, category } = req.body;
  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (category !== undefined && typeof category !== 'string') {
    return res.status(400).json({ error: 'Category must be a string' });
  }
  if (!name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const trimmedCategory = category !== undefined ? category.trim() : '';
  if (trimmedCategory.length > 50) {
    return res.status(400).json({ error: 'Category must be 50 characters or fewer' });
  }
  const finalCategory = trimmedCategory === '' ? 'Uncategorized' : trimmedCategory;
  db.run(
    'INSERT INTO items (name, category) VALUES (?, ?)',
    [name.trim(), finalCategory],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, name: name.trim(), category: finalCategory });
    }
  );
});

// Delete an item
app.delete('/api/items/:id', (req, res) => {
  db.run('DELETE FROM items WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
