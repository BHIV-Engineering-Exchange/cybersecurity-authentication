import { useState } from 'react';

export default function EntityInput({ onValid = () => {} }) {
  const [entity, setEntity] = useState('');
  const [error, setError] = useState('');

  // You can customize this validation if needed
  const isValidEntity = (input) => input.trim().length >= 3;

  const handleChange = (e) => {
    const val = e.target.value;
    setEntity(val);

    if (isValidEntity(val)) {
      setError('');
      onValid(val);
    } else {
      setError('Invalid ID. Must be at least 3 characters.');
    }
  };

  return (
    <div className="p-4">
      <input
        type="text"
        value={entity}
        onChange={handleChange}
        placeholder="Enter wallet ID"
        className="w-full border p-2 rounded-md shadow-sm text-sm"
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
