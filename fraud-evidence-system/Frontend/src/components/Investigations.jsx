import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Investigations = () => {
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [entities, setEntities] = useState([{ type: 'wallet_address', value: '' }]);
  const [investigationTitle, setInvestigationTitle] = useState('');
  const [investigationDescription, setInvestigationDescription] = useState('');
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);

  // Fetch all investigations
  const fetchInvestigations = async () => {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('authToken');

      const response = await axios.get(`${backendUrl}/api/investigations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setInvestigations(response.data.investigations || response.data);
    } catch (error) {
      console.error('Error fetching investigations:', error);
      toast.error('Failed to fetch investigations');
    } finally {
      setLoading(false);
    }
  };

  // Create or update investigation linking
  const linkEntities = async (e) => {
    e.preventDefault();
    
    // Filter out empty entities
    const validEntities = entities.filter(entity => entity.value.trim() !== '');
    
    if (validEntities.length === 0) {
      toast.error('Please add at least one entity');
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('authToken');
      const user = JSON.parse(localStorage.getItem('userInfo') || '{}');

      const response = await axios.post(`${backendUrl}/api/investigations/link`, {
        entities: validEntities,
        metadata: {
          title: investigationTitle || `Investigation - ${new Date().toISOString().split('T')[0]}`,
          description: investigationDescription,
          createdBy: user.id
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast.success('Entities linked successfully under investigation ID: ' + response.data.investigationId);
      setShowLinkForm(false);
      setEntities([{ type: 'wallet_address', value: '' }]);
      setInvestigationTitle('');
      setInvestigationDescription('');
      fetchInvestigations();
    } catch (error) {
      console.error('Error linking entities:', error);
      toast.error('Failed to link entities: ' + (error.response?.data?.error || error.message));
    }
  };

  // Add a new entity field
  const addEntity = () => {
    setEntities([...entities, { type: 'wallet_address', value: '' }]);
  };

  // Remove an entity field
  const removeEntity = (index) => {
    if (entities.length > 1) {
      const newEntities = [...entities];
      newEntities.splice(index, 1);
      setEntities(newEntities);
    }
  };

  // Update entity field
  const updateEntity = (index, field, value) => {
    const newEntities = [...entities];
    newEntities[index][field] = value;
    setEntities(newEntities);
  };

  // Analyze connections in an investigation
  const analyzeConnections = async (investigationId) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('authToken');

      const response = await axios.post(`${backendUrl}/api/investigations/${investigationId}/analyze`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast.success('Connection analysis completed!');
      fetchInvestigations();
    } catch (error) {
      console.error('Error analyzing connections:', error);
      toast.error('Failed to analyze connections');
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">🔍 Investigations</h2>
        <button
          onClick={() => setShowLinkForm(!showLinkForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showLinkForm ? 'Cancel' : 'Link Entities'}
        </button>
      </div>

      {showLinkForm && (
        <div className="mb-8 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="text-lg font-medium mb-4">Group Multiple Wallets/IPs Under One Investigation</h3>
          <form onSubmit={linkEntities}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Investigation Title</label>
              <input
                type="text"
                value={investigationTitle}
                onChange={(e) => setInvestigationTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter investigation title"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={investigationDescription}
                onChange={(e) => setInvestigationDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter investigation description"
                rows="3"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Entities to Link (Wallets, IPs, etc.)</label>
              <p className="text-xs text-gray-500 mb-2">Add multiple entities to group them under a single investigation ID</p>
              {entities.map((entity, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <select
                    value={entity.type}
                    onChange={(e) => updateEntity(index, 'type', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="wallet_address">Wallet Address</option>
                    <option value="ip_address">IP Address</option>
                    <option value="domain">Domain</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="device_id">Device ID</option>
                    <option value="transaction_hash">Transaction Hash</option>
                  </select>
                  <input
                    type="text"
                    value={entity.value}
                    onChange={(e) => updateEntity(index, 'value', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter entity value"
                  />
                  {entities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntity(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addEntity}
                className="mt-2 px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                + Add Entity
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLinkForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Group Under Investigation
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Active Investigations</h3>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading investigations...</span>
          </div>
        ) : investigations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No investigations found.</p>
            <p className="mt-2">Click "Link Entities" to create your first investigation.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {investigations.map((investigation) => (
              <div key={investigation._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-lg text-gray-800">{investigation.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{investigation.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        investigation.status === 'active' ? 'bg-green-100 text-green-800' :
                        investigation.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {investigation.status}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        investigation.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        investigation.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        investigation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {investigation.priority} priority
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {investigation.entities?.length || 0} entities
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        Risk: {(investigation.riskAssessment?.overallRisk * 100).toFixed(1)}%
                      </span>
                      {investigation.investigationId && (
                        <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                          ID: {investigation.investigationId}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => analyzeConnections(investigation._id)}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Analyze
                    </button>
                  </div>
                </div>

                {investigation.entities && investigation.entities.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Linked Entities:</h5>
                    <div className="flex flex-wrap gap-2">
                      {investigation.entities.map((entity, index) => (
                        <span 
                          key={index} 
                          className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700"
                          title={`${entity.type}: ${entity.value}`}
                        >
                          {entity.type}: {entity.value.substring(0, 10)}...
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {investigation.connections && investigation.connections.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Connections:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {investigation.connections.map((connection, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                          <div className="font-medium text-gray-800">
                            {connection.type.replace('_', ' ').toUpperCase()}
                          </div>
                          <div className="text-gray-600 truncate">
                            {connection.entity1.value.substring(0, 8)}... ↔ {connection.entity2.value.substring(0, 8)}...
                          </div>
                          <div className="flex items-center mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="h-1.5 rounded-full bg-blue-600" 
                                style={{ width: `${connection.strength * 100}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-xs text-gray-600">
                              {(connection.strength * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  Created: {new Date(investigation.createdAt).toLocaleString()}
                  {investigation.investigationId && (
                    <span className="ml-2">ID: {investigation.investigationId}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Investigations;