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

// Get all items
app.get('/api/items', (req, res) => {
  db.all('SELECT * FROM items ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new item
app.post('/api/items', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  db.run('INSERT INTO items (name) VALUES (?)', [name.trim()], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name: name.trim() });
  });
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
