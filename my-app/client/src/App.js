import { useEffect, useState } from 'react';

function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [addError, setAddError] = useState('');

  const loadItems = () => {
    fetch('/api/items')
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, []);

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

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No items yet. Add one above.</p>
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
