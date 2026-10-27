import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { AlertTriangle, MapPin, Shield, Eye } from 'lucide-react';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for different threat levels
const createCustomIcon = (color, size = 25) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
    ">⚠</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
};

const ThreatMap = () => {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(5);

  useEffect(() => {
    fetchThreatData();
  }, []);

  const fetchThreatData = async () => {
    try {
      setLoading(true);
      
      // Simulate API call - in real implementation, this would fetch from backend
      const mockThreats = [
        {
          id: '1',
          walletAddress: '0x742d35Cc6634C0532925a3b8D',
          latitude: 19.0760,
          longitude: 72.8777,
          city: 'Mumbai',
          country: 'India',
          riskLevel: 'HIGH',
          riskScore: 85,
          org: 'Suspicious Trading Firm',
          timestamp: new Date().toISOString(),
          threatType: 'Rapid Dumping',
          evidenceCount: 3,
          escalated: true
        },
        {
          id: '2',
          walletAddress: 'b716431137bcd00eb3c48ab0e1803daad53555a1599b646d610e09009be811a2',
          latitude: 28.6139,
          longitude: 77.2090,
          city: 'New Delhi',
          country: 'India',
          riskLevel: 'MEDIUM',
          riskScore: 65,
          org: 'Anonymous Proxy',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          threatType: 'Suspicious Pattern',
          evidenceCount: 2,
          escalated: false
        },
        {
          id: '3',
          walletAddress: '030c12e53f80048ede2e201f30d5c7c95c758c5e3fecb39cde73f5f349ecf0de',
          latitude: 12.9716,
          longitude: 77.5946,
          city: 'Bangalore',
          country: 'India',
          riskLevel: 'CRITICAL',
          riskScore: 92,
          org: 'High-Risk Entity',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          threatType: 'Large Amount Transfer',
          evidenceCount: 5,
          escalated: true
        },
        {
          id: '4',
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
          latitude: 22.5726,
          longitude: 88.3639,
          city: 'Kolkata',
          country: 'India',
          riskLevel: 'LOW',
          riskScore: 35,
          org: 'Normal Trading',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          threatType: 'Monitoring',
          evidenceCount: 1,
          escalated: false
        },
        {
          id: '5',
          walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
          latitude: 39.9042,
          longitude: 116.4074,
          city: 'Beijing',
          country: 'China',
          riskLevel: 'HIGH',
          riskScore: 78,
          org: 'International Entity',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          threatType: 'Cross-border Activity',
          evidenceCount: 4,
          escalated: true
        }
      ];

      setThreats(mockThreats);
      
      // Adjust map center to show all threats
      if (mockThreats.length > 0) {
        const avgLat = mockThreats.reduce((sum, t) => sum + t.latitude, 0) / mockThreats.length;
        const avgLng = mockThreats.reduce((sum, t) => sum + t.longitude, 0) / mockThreats.length;
        setMapCenter([avgLat, avgLng]);
      }
      
    } catch (error) {
      console.error('Error fetching threat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThreatIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return createCustomIcon('#dc2626', 35); // Red
      case 'HIGH':
        return createCustomIcon('#ea580c', 30); // Orange
      case 'MEDIUM':
        return createCustomIcon('#d97706', 25); // Yellow-orange
      case 'LOW':
        return createCustomIcon('#059669', 20); // Green
      default:
        return createCustomIcon('#6b7280', 20); // Gray
    }
  };

  const getThreatColor = (riskLevel) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading threat map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <MapPin className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Live Threat Map</h3>
            <p className="text-sm text-gray-600">{threats.length} active threats detected</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span className="text-xs text-gray-600">Critical</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-xs text-gray-600">High</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Medium</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Low</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-96 rounded-lg overflow-hidden border border-gray-200 shadow-lg">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {threats.map((threat) => (
            <Marker
              key={threat.id}
              position={[threat.latitude, threat.longitude]}
              icon={getThreatIcon(threat.riskLevel)}
              eventHandlers={{
                click: () => setSelectedThreat(threat)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="font-semibold text-gray-900">{threat.threatType}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><strong>Wallet:</strong> {threat.walletAddress.substring(0, 16)}...</p>
                    <p><strong>Location:</strong> {threat.city}, {threat.country}</p>
                    <p><strong>Risk Score:</strong> {threat.riskScore}%</p>
                    <p><strong>Organization:</strong> {threat.org}</p>
                    <p><strong>Evidence:</strong> {threat.evidenceCount} files</p>
                    <p><strong>Time:</strong> {formatTimestamp(threat.timestamp)}</p>
                    {threat.escalated && (
                      <div className="flex items-center space-x-1 mt-2">
                        <Shield className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-blue-600 font-medium">ESCALATED</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Threat Details Panel */}
      {selectedThreat && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-gray-900">Threat Details</h4>
            <button
              onClick={() => setSelectedThreat(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Risk Level:</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getThreatColor(selectedThreat.riskLevel)}`}>
                  {selectedThreat.riskLevel}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Risk Score:</span>
                <span className="text-sm font-mono">{selectedThreat.riskScore}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Threat Type:</span>
                <span className="text-sm">{selectedThreat.threatType}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Location:</span>
                <span className="text-sm">{selectedThreat.city}, {selectedThreat.country}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Organization:</span>
                <span className="text-sm">{selectedThreat.org}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Evidence Files:</span>
                <span className="text-sm">{selectedThreat.evidenceCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Detected:</span>
                <span className="text-sm">{formatTimestamp(selectedThreat.timestamp)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                {selectedThreat.escalated ? (
                  <span className="flex items-center space-x-1 text-blue-600">
                    <Shield className="w-3 h-3" />
                    <span className="text-xs font-medium">ESCALATED</span>
                  </span>
                ) : (
                  <span className="text-yellow-600 text-xs font-medium">MONITORING</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Wallet Address:</span>
            </div>
            <p className="text-sm font-mono bg-gray-100 p-2 rounded break-all">
              {selectedThreat.walletAddress}
            </p>
          </div>
        </div>
      )}

      {/* Threat Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-900">Critical</p>
              <p className="text-2xl font-bold text-red-600">
                {threats.filter(t => t.riskLevel === 'CRITICAL').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-orange-900">High</p>
              <p className="text-2xl font-bold text-orange-600">
                {threats.filter(t => t.riskLevel === 'HIGH').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Medium</p>
              <p className="text-2xl font-bold text-yellow-600">
                {threats.filter(t => t.riskLevel === 'MEDIUM').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Escalated</p>
              <p className="text-2xl font-bold text-blue-600">
                {threats.filter(t => t.escalated).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatMap;