import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const AdminCybercrimePage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedingPoliceStations, setSeedingPoliceStations] = useState(false);

  // Fetch all contacts
  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams();
      
      if (stateFilter) params.append('state', stateFilter);
      if (cityFilter) params.append('city', cityFilter);
      if (specializationFilter) params.append('specialization', specializationFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cybercrime/contacts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.data || []);
      } else {
        toast.error('Failed to fetch cybercrime contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Error fetching cybercrime contacts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      const [statesRes, citiesRes, specializationsRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cybercrime/states`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cybercrime/cities`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cybercrime/specializations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statesRes.ok) {
        const statesData = await statesRes.json();
        setStates(statesData.data || []);
      }

      if (citiesRes.ok) {
        const citiesData = await citiesRes.json();
        setCities(citiesData.data || []);
      }

      if (specializationsRes.ok) {
        const specializationsData = await specializationsRes.json();
        setSpecializations(specializationsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchFilterOptions();
  }, [stateFilter, cityFilter, specializationFilter, priorityFilter, searchTerm]);

  const handleContactClick = (contact) => {
    setSelectedContact(contact);
    setShowModal(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setShowModal(true);
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cybercrime/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Contact deleted successfully');
        fetchContacts();
      } else {
        toast.error('Failed to delete contact');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Error deleting contact');
    }
  };

  const handleSaveContact = async (contactData) => {
    try {
      const token = localStorage.getItem('authToken');
      const url = editingContact 
        ? `${process.env.REACT_APP_BACKEND_URL}/api/cybercrime/contacts/${editingContact._id}`
        : `${process.env.REACT_APP_BACKEND_URL}/api/cybercrime/contacts`;
      
      const method = editingContact ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(contactData)
      });

      if (response.ok) {
        toast.success(editingContact ? 'Contact updated successfully' : 'Contact created successfully');
        setShowModal(false);
        setEditingContact(null);
        setSelectedContact(null);
        fetchContacts();
      } else {
        toast.error('Failed to save contact');
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Error saving contact');
    }
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm('This will clear all existing contacts and seed the database with cybercrime contacts from the JSON file. Continue?')) {
      return;
    }

    setSeeding(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cybercrime/seed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Database seeded successfully! ${data.count} contacts added.`);
        fetchContacts();
        fetchFilterOptions();
      } else {
        toast.error('Failed to seed database');
      }
    } catch (error) {
      console.error('Error seeding database:', error);
      toast.error('Error seeding database');
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedPoliceStations = async () => {
    if (!window.confirm('This will clear all existing police stations and seed the database with sample police station data. Continue?')) {
      return;
    }

    setSeedingPoliceStations(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/police-stations/seed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Police stations seeded successfully! ${data.count} stations added.`);
      } else {
        toast.error('Failed to seed police stations');
      }
    } catch (error) {
      console.error('Error seeding police stations:', error);
      toast.error('Error seeding police stations');
    } finally {
      setSeedingPoliceStations(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchTerm || 
      contact.officerDesignation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.city?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-2xl">👮</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cybercrime Contacts Management</h1>
            <p className="text-gray-600">Manage police stations and cybercrime contacts database</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All States</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
            <select
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Specializations</option>
              {specializations.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {filteredContacts.length} of {contacts.length} contacts
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {seeding ? 'Seeding...' : 'Seed Cybercrime Contacts'}
            </button>
            <button
              onClick={handleSeedPoliceStations}
              disabled={seedingPoliceStations}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {seedingPoliceStations ? 'Seeding...' : 'Seed Police Stations'}
            </button>
            <button
              onClick={() => {
                setEditingContact(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add New Contact
            </button>
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Officer/Designation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specialization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr key={contact._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {contact.officerDesignation}
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {contact.address}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {contact.city}, {contact.state}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {contact.email[0] && (
                        <div className="flex items-center space-x-1">
                          <span>📧</span>
                          <span>{contact.email[0]}</span>
                        </div>
                      )}
                      {contact.mobile[0] && (
                        <div className="flex items-center space-x-1">
                          <span>📱</span>
                          <span>{contact.mobile[0]}</span>
                        </div>
                      )}
                      {contact.telephone[0] && (
                        <div className="flex items-center space-x-1">
                          <span>📞</span>
                          <span>{contact.telephone[0]}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{contact.specialization}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      contact.priority === 'high' ? 'bg-red-100 text-red-800' :
                      contact.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {contact.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleContactClick(contact)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditContact(contact)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact Modal */}
      {showModal && (
        <ContactModal
          contact={selectedContact || editingContact}
          isEditing={!!editingContact}
          onClose={() => {
            setShowModal(false);
            setSelectedContact(null);
            setEditingContact(null);
          }}
          onSave={handleSaveContact}
        />
      )}
    </div>
  );
};

// Contact Modal Component
const ContactModal = ({ contact, isEditing, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    regionalOffice: contact?.regionalOffice || '',
    officerDesignation: contact?.officerDesignation || '',
    address: contact?.address || '',
    email: contact?.email || [],
    mobile: contact?.mobile || [],
    telephone: contact?.telephone || [],
    fax: contact?.fax || [],
    state: contact?.state || '',
    city: contact?.city || '',
    specialization: contact?.specialization || '',
    priority: contact?.priority || 'medium'
  });

  const [newEmail, setNewEmail] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newTelephone, setNewTelephone] = useState('');
  const [newFax, setNewFax] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addContactInfo = (type, value) => {
    if (!value.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], value.trim()]
    }));
    
    if (type === 'email') setNewEmail('');
    if (type === 'mobile') setNewMobile('');
    if (type === 'telephone') setNewTelephone('');
    if (type === 'fax') setNewFax('');
  };

  const removeContactInfo = (type, index) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Contact' : 'Contact Details'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Regional Office</label>
                  <input
                    type="text"
                    value={formData.regionalOffice}
                    onChange={(e) => handleInputChange('regionalOffice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Officer/Designation</label>
                <input
                  type="text"
                  value={formData.officerDesignation}
                  onChange={(e) => handleInputChange('officerDesignation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Contact Information Arrays */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Addresses</label>
                  <div className="space-y-2">
                    {formData.email.map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{email}</span>
                        <button
                          type="button"
                          onClick={() => removeContactInfo('email', index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Add email address"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addContactInfo('email', newEmail)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Numbers</label>
                  <div className="space-y-2">
                    {formData.mobile.map((mobile, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{mobile}</span>
                        <button
                          type="button"
                          onClick={() => removeContactInfo('mobile', index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMobile}
                        onChange={(e) => setNewMobile(e.target.value)}
                        placeholder="Add mobile number"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addContactInfo('mobile', newMobile)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telephone Numbers</label>
                  <div className="space-y-2">
                    {formData.telephone.map((telephone, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{telephone}</span>
                        <button
                          type="button"
                          onClick={() => removeContactInfo('telephone', index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newTelephone}
                        onChange={(e) => setNewTelephone(e.target.value)}
                        placeholder="Add telephone number"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addContactInfo('telephone', newTelephone)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Contact
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{contact.officerDesignation}</h3>
                <p className="text-sm text-gray-600">{contact.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Location</h4>
                  <p className="text-sm text-gray-600">{contact.city}, {contact.state}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Specialization</h4>
                  <p className="text-sm text-gray-600">{contact.specialization}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Contact Information</h4>
                <div className="space-y-2">
                  {contact.email.map((email, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span>📧</span>
                      <span className="text-sm text-gray-600">{email}</span>
                    </div>
                  ))}
                  {contact.mobile.map((mobile, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span>📱</span>
                      <span className="text-sm text-gray-600">{mobile}</span>
                    </div>
                  ))}
                  {contact.telephone.map((telephone, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span>📞</span>
                      <span className="text-sm text-gray-600">{telephone}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCybercrimePage;
