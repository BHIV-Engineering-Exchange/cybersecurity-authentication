import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const InvestigatorPage = () => {
  const [policeStations, setPoliceStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch police stations from API with fallback data
    const fetchPoliceStations = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/police-stations/stations`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            setPoliceStations(data.data);
          } else {
            // Real police station data from the table
            setPoliceStations([
              {
                _id: '1',
                zoneRangeDistrict: "Agra Range",
                officeContact: "DIG",
                officeContactMobile: "945440019",
                email: "digraga@n",
                telephone: ["0562-2463", "0562-2263"],
                state: "Uttar Pradesh",
                city: "Agra",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '2',
                zoneRangeDistrict: "Aligarh Range",
                officeContact: "DIG",
                officeContactMobile: "945440039",
                email: "digraih@u",
                telephone: ["0571-2400", "0571-2400"],
                state: "Uttar Pradesh",
                city: "Aligarh",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '3',
                zoneRangeDistrict: "Allahabad Range",
                officeContact: "DIG",
                officeContactMobile: "945440019",
                email: "digrald@n",
                telephone: ["0532-2260", "0532-2260"],
                state: "Uttar Pradesh",
                city: "Allahabad",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '4',
                zoneRangeDistrict: "Chitrakoot Dham Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrckd@g",
                telephone: ["0519-2220", "0519-2220"],
                state: "Uttar Pradesh",
                city: "Chitrakoot",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '5',
                zoneRangeDistrict: "Moradabad Range",
                officeContact: "DIG",
                officeContactMobile: "945440021",
                email: "digrmdd@",
                telephone: ["0591-2435", "0591-2435"],
                state: "Uttar Pradesh",
                city: "Moradabad",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '6',
                zoneRangeDistrict: "Basti Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrbas@n",
                telephone: ["05542-246", "05542-246"],
                state: "Uttar Pradesh",
                city: "Basti",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '7',
                zoneRangeDistrict: "Sant Kabir Nagar",
                officeContact: "SP",
                officeContactMobile: "945440028",
                email: "spkbn-up@",
                telephone: ["05547-222", "05547-226"],
                state: "Uttar Pradesh",
                city: "Sant Kabir Nagar",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '8',
                zoneRangeDistrict: "Sidhar th Nagar",
                officeContact: "SP",
                officeContactMobile: "945440030",
                email: "spsdr-up@",
                telephone: ["05544-222", "05544-222"],
                state: "Uttar Pradesh",
                city: "Sidhar th Nagar",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '9',
                zoneRangeDistrict: "Devipatan Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrgon@m",
                telephone: ["05262-230", "05262-230"],
                state: "Uttar Pradesh",
                city: "Devipatan",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '10',
                zoneRangeDistrict: "Gorakhpur Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrgkr@u",
                telephone: ["0551-2201", "0551-2200"],
                state: "Uttar Pradesh",
                city: "Gorakhpur",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '11',
                zoneRangeDistrict: "Kushi Nagar",
                officeContact: "SP",
                officeContactMobile: "945440028",
                email: "spksn-up@",
                telephone: ["556424-24-", "0510-2333"],
                state: "Uttar Pradesh",
                city: "Kushi Nagar",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '12',
                zoneRangeDistrict: "Jhansi Range",
                officeContact: "DIG",
                officeContactMobile: "945440021",
                email: "digrjsi@up",
                telephone: ["-", "0510-2333"],
                state: "Uttar Pradesh",
                city: "Jhansi",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '13',
                zoneRangeDistrict: "Kanpur Range",
                officeContact: "DIG",
                officeContactMobile: "945440021",
                email: "digrknr@up",
                telephone: ["0512-2536", "0512-2530"],
                state: "Uttar Pradesh",
                city: "Kanpur",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '14',
                zoneRangeDistrict: "Kanpur Nagar",
                officeContact: "SSP",
                officeContactMobile: "945440028",
                email: "sspknr-up@",
                telephone: ["0512-2304", "0512-2530"],
                state: "Uttar Pradesh",
                city: "Kanpur Nagar",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '15',
                zoneRangeDistrict: "Faizabad Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrfzd@n",
                telephone: ["05278-224", "05278-224"],
                state: "Uttar Pradesh",
                city: "Faizabad",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '16',
                zoneRangeDistrict: "Ambedkar Nagar",
                officeContact: "SP",
                officeContactMobile: "945440024",
                email: "spabr-up@",
                telephone: ["05271-244-", "-"],
                state: "Uttar Pradesh",
                city: "Ambedkar Nagar",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '17',
                zoneRangeDistrict: "Lucknow Range",
                officeContact: "DIG",
                officeContactMobile: "94544002:",
                email: "digrlkw@g",
                telephone: ["0522-2393", "0522-2719"],
                state: "Uttar Pradesh",
                city: "Lucknow",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '18',
                zoneRangeDistrict: "Gautam Budh Nagar",
                officeContact: "SSP",
                officeContactMobile: "945440027",
                email: "sspgbn-upc",
                telephone: ["0120-2514", "0120-2549"],
                state: "Uttar Pradesh",
                city: "Gautam Budh Nagar",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '19',
                zoneRangeDistrict: "Saharanpur Range",
                officeContact: "DIG",
                officeContactMobile: "94544002:",
                email: "digrsah@u",
                telephone: ["0132-2761", "0132-2761"],
                state: "Uttar Pradesh",
                city: "Saharanpur",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '20',
                zoneRangeDistrict: "Muzaffar Nagar",
                officeContact: "SSP",
                officeContactMobile: "945440031",
                email: "sspzuf-up@",
                telephone: ["0131-2436", "0131-2437"],
                state: "Uttar Pradesh",
                city: "Muzaffar Nagar",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '21',
                zoneRangeDistrict: "Azamgarh Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrazh@u",
                telephone: ["05462-260", "05462-260"],
                state: "Uttar Pradesh",
                city: "Azamgarh",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '22',
                zoneRangeDistrict: "Mirzapur Range",
                officeContact: "DIG",
                officeContactMobile: "945440021",
                email: "digrmir@n",
                telephone: ["05442-256", "05442-257"],
                state: "Uttar Pradesh",
                city: "Mirzapur",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '23',
                zoneRangeDistrict: "Sant Ra vidas Nagar",
                officeContact: "SP",
                officeContactMobile: "94544003(",
                email: "spsrn-up@",
                telephone: ["05414-250", "05414-250"],
                state: "Uttar Pradesh",
                city: "Sant Ra vidas Nagar",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '24',
                zoneRangeDistrict: "Varanasi Range",
                officeContact: "DIG",
                officeContactMobile: "945440019",
                email: "digrvns@n",
                telephone: ["0542-2502", "0542-2509"],
                state: "Uttar Pradesh",
                city: "Varanasi",
                specialization: "General Law Enforcement",
                priority: "high"
              }
            ]);
          }
        } else {
          console.error('Failed to fetch police stations');
          // Use same fallback data on API error
          setPoliceStations([
              {
                _id: '1',
                zoneRangeDistrict: "Agra Range",
                officeContact: "DIG",
                officeContactMobile: "945440019",
                email: "digraga@n",
                telephone: ["0562-2463", "0562-2263"],
                state: "Uttar Pradesh",
                city: "Agra",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '17',
                zoneRangeDistrict: "Lucknow Range",
                officeContact: "DIG",
                officeContactMobile: "94544002:",
                email: "digrlkw@g",
                telephone: ["0522-2393", "0522-2719"],
                state: "Uttar Pradesh",
                city: "Lucknow",
                specialization: "General Law Enforcement",
                priority: "high"
              }
            ]);
        }
      } catch (error) {
        console.error('Error fetching police stations:', error);
        // Use same fallback data on error
        setPoliceStations([
          {
            _id: '1',
            zoneRangeDistrict: "Agra Range",
            officeContact: "DIG",
            officeContactMobile: "945440019",
            email: "digraga@n",
            telephone: ["0562-2463", "0562-2263"],
            state: "Uttar Pradesh",
            city: "Agra",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '17',
            zoneRangeDistrict: "Lucknow Range",
            officeContact: "DIG",
            officeContactMobile: "94544002:",
            email: "digrlkw@g",
            telephone: ["0522-2393", "0522-2719"],
            state: "Uttar Pradesh",
            city: "Lucknow",
            specialization: "General Law Enforcement",
            priority: "high"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPoliceStations();
  }, []);

  const filteredStations = policeStations.filter(station =>
    station.zoneRangeDistrict.toLowerCase().includes(searchTerm.toLowerCase()) ||
    station.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    station.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-2xl">🔍</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Investigator Dashboard</h1>
            <p className="text-gray-600">Access police station contacts and information</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Police Stations</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by Zone/Range/District, City, or State..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredStations.length} of {policeStations.length} police stations
        </div>
      </div>

      {/* Police Station Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Select Police Station</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Choose Police Station</label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a police station...</option>
              {filteredStations.map((station) => (
                <option key={station._id} value={station._id}>
                  {station.zoneRangeDistrict}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Station Details */}
          {selectedStation && (() => {
            const station = policeStations.find(s => s._id === selectedStation);
            return station ? (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Selected Station Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Zone/Range/District:</strong> {station.zoneRangeDistrict}</div>
                  <div><strong>Designation:</strong> {station.officeContact}</div>
                  <div><strong>Mobile No.:</strong> {station.officeContactMobile}</div>
                  <div><strong>E-Mail:</strong> {station.email}</div>
                  {station.telephone && station.telephone.length > 0 && (
                    <div><strong>Telephone:</strong> {station.telephone.join(', ')}</div>
                  )}
                  <div><strong>Location:</strong> {station.city}, {station.state}</div>
                  <div><strong>Specialization:</strong> {station.specialization}</div>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* All Stations Grid */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Available Police Stations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStations.map((station) => (
            <div
              key={station._id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedStation === station._id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
              onClick={() => setSelectedStation(station._id)}
            >
              <h3 className="font-semibold text-gray-900 mb-2">{station.zoneRangeDistrict}</h3>
              <p className="text-sm text-gray-600 mb-2">{station.city}, {station.state}</p>
              <div className="space-y-1 text-xs text-gray-500">
                <div><strong>Contact:</strong> {station.officeContact}</div>
                <div><strong>Mobile:</strong> {station.officeContactMobile}</div>
                <div><strong>Email:</strong> {station.email}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InvestigatorPage;
