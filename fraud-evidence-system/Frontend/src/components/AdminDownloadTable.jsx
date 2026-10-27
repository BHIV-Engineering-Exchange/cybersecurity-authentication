import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminDownloadTable = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/dumps', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFiles(res.data.files);
    } catch (err) {
      console.error('Failed to fetch files:', err);
      setError('Unauthorized or server error.');
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">🛡 Admin Dump Files</h2>

      {error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <table className="min-w-full bg-white border border-gray-300 rounded shadow">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Filename</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-2">{file}</td>
                <td className="p-2">
                  <a
                    href={`/dumps/${file}`}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    download
                  >
                    ⬇ Download
                  </a>
                </td>
              </tr>
            ))}
            {files.length === 0 && (
              <tr>
                <td colSpan="2" className="p-4 text-gray-500 text-center">
                  No dump files found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminDownloadTable;
