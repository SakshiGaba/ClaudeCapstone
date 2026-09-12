import { useEffect, useMemo, useState } from 'react';

function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [addError, setAddError] = useState('');

  const loadItems = (activeFilter = filter) => {
    const url =
      activeFilter && activeFilter !== 'All'
        ? `/api/items?category=${encodeURIComponent(activeFilter)}`
        : '/api/items';
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const filterOptions = useMemo(() => {
    const categories = new Set(items.map((item) => item.category));
    if (filter !== 'All') categories.add(filter);
    return Array.from(categories).sort();
  }, [items, filter]);

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (e) => {
    const value = e.target.value;
    setFilter(value);
    loadItems(value);
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category }),
    });
    if (res.ok) {
      setName('');
      setCategory('');
      setAddError('');
      loadItems();
    } else {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error || 'Failed to add item');
    }
  };

  const deleteItem = async (id) => {
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    loadItems();
  };

  return (
    <div className="container">
      <h1>Items</h1>
      <form onSubmit={addItem} className="add-form">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New item name"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional)"
        />
        <button type="submit">Add</button>
      </form>
      {addError && <p className="add-error">{addError}</p>}

      <div className="filter-control">
        <label htmlFor="category-filter">Filter by category:</label>
        <select id="category-filter" value={filter} onChange={handleFilterChange}>
          <option value="All">All</option>
          {filterOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        filter !== 'All' ? (
          <p>No items in this category.</p>
        ) : (
          <p>No items yet. Add one above.</p>
        )
      ) : (
        <ul className="item-list">
          {items.map((item) => (
            <li key={item.id}>
              <span>{item.name}</span>
              <button onClick={() => deleteItem(item.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
