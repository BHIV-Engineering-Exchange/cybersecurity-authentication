import { MapPin } from "lucide-react";
import { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";

interface ComplaintLocation {
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  count: number;
}

interface ThreatMapProps {
  locations?: ComplaintLocation[];
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export function ThreatMap({ locations = [] }: ThreatMapProps) {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  // Convert complaint locations to threat locations format
  const threatLocations = locations
    .filter(loc => loc.latitude !== null && loc.longitude !== null)
    .map(loc => ({
      country: loc.country || loc.city || "Unknown",
      city: loc.city,
      threats: loc.count,
      coordinates: [loc.longitude!, loc.latitude!] as [number, number],
      region: loc.country || "Unknown",
    }));

  // If no locations provided, use empty array (map will be empty)
  const maxThreats = threatLocations.length > 0 
    ? Math.max(...threatLocations.map(l => l.threats))
    : 1;

  const getThreatSize = (threats: number) => {
    if (threats > maxThreats * 0.7) return 8;
    if (threats > maxThreats * 0.4) return 6;
    if (threats > maxThreats * 0.2) return 5;
    return 4;
  };

  const getThreatColor = (threats: number) => {
    if (threats > maxThreats * 0.7) return { fill: "#ef4444", border: "border-red-400", text: "text-red-400", bg: "bg-red-500" };
    if (threats > maxThreats * 0.4) return { fill: "#f97316", border: "border-orange-400", text: "text-orange-400", bg: "bg-orange-500" };
    if (threats > maxThreats * 0.2) return { fill: "#eab308", border: "border-yellow-400", text: "text-yellow-400", bg: "bg-yellow-500" };
    return { fill: "#10b981", border: "border-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500" };
  };

  return (
    <div>
      {/* Real World Map Container */}
      <div className="relative h-[500px] bg-black/60 border border-emerald-500/20 rounded-lg overflow-hidden mb-6">
        {/* Ambient glow effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(239,68,68,0.1),transparent_50%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(249,115,22,0.1),transparent_50%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none"></div>

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 147,
            center: [0, 20]
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="rgba(16, 185, 129, 0.1)"
                    stroke="rgba(16, 185, 129, 0.3)"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { 
                        fill: "rgba(16, 185, 129, 0.2)", 
                        outline: "none",
                        transition: "all 0.3s"
                      },
                      pressed: { outline: "none" }
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Complaint Location Markers */}
            {threatLocations.map((location, index) => {
              const size = getThreatSize(location.threats);
              const colors = getThreatColor(location.threats);
              const locationKey = `${location.country}-${location.city || ""}-${index}`;
              
              return (
                <Marker key={index} coordinates={location.coordinates}>
                  <g
                    onMouseEnter={() => setHoveredLocation(locationKey)}
                    onMouseLeave={() => setHoveredLocation(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Outer pulse ring */}
                    <circle
                      r={size * 2}
                      fill={colors.fill}
                      fillOpacity={0.1}
                      className="animate-ping"
                    />
                    {/* Main marker */}
                    <circle
                      r={size}
                      fill={colors.fill}
                      fillOpacity={0.9}
                      className="animate-pulse"
                    />
                    {/* Center dot */}
                    <circle
                      r={size * 0.4}
                      fill="white"
                      fillOpacity={0.9}
                    />
                  </g>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Hover Tooltip */}
        {hoveredLocation && (
          <div className="absolute top-4 left-4 z-50 pointer-events-none animate-in fade-in slide-in-from-left-2 duration-200">
            {(() => {
              const location = threatLocations.find((l, idx) => `${l.country}-${l.city || ""}-${idx}` === hoveredLocation);
              if (!location) return null;
              const colors = getThreatColor(location.threats);
              
              return (
                <div className={`bg-black/95 border ${colors.border} rounded-lg p-4 shadow-2xl backdrop-blur-xl min-w-[200px]`}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className={`w-5 h-5 ${colors.text}`} />
                    <div className={`${colors.text} font-mono`}>
                      {location.city && location.country ? `${location.city}, ${location.country}` : location.country}
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs font-mono mb-2">{location.region}</div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-gray-500 text-sm">Complaints:</span>
                    <span className={`${colors.text} font-mono text-lg`}>{location.threats}</span>
                  </div>
                  <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                    <div className={`h-full ${colors.bg} transition-all`} style={{ width: `${(location.threats / maxThreats) * 100}%` }}></div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-black/90 border border-emerald-500/30 rounded-lg p-3 backdrop-blur-xl z-10">
          <div className="text-xs text-gray-400 font-mono mb-2">Complaint Level</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-500 font-mono">High ({Math.ceil(maxThreats * 0.7)}+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-xs text-gray-500 font-mono">Medium ({Math.ceil(maxThreats * 0.4)}+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-xs text-gray-500 font-mono">Low ({Math.ceil(maxThreats * 0.2)}+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-xs text-gray-500 font-mono">Minimal (&lt;{Math.ceil(maxThreats * 0.2)})</span>
            </div>
          </div>
        </div>

        {/* Controls Hint */}
        <div className="absolute top-4 right-4 bg-black/80 border border-cyan-500/30 rounded-lg px-3 py-2 backdrop-blur-xl z-10">
          <p className="text-xs text-cyan-400 font-mono">🖱️ Scroll to zoom • Drag to pan</p>
        </div>

        {/* Empty State */}
        {threatLocations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 font-mono">No complaint locations available</p>
              <p className="text-gray-600 text-xs font-mono mt-1">Complaints with location data will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Complaint Locations Grid */}
      {threatLocations.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {threatLocations.slice(0, 9).map((location, index) => {
              const colors = getThreatColor(location.threats);
              const locationKey = `${location.country}-${location.city || ""}-${index}`;
              return (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-3 bg-black/40 border ${colors.border} border-opacity-20 rounded-lg hover:border-opacity-40 transition-all cursor-pointer group`}
                  onMouseEnter={() => setHoveredLocation(locationKey)}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${colors.text} group-hover:scale-110 transition-transform`} />
                    <div>
                      <div className="text-gray-300 text-sm">
                        {location.city && location.country ? `${location.city}, ${location.country}` : location.country}
                      </div>
                      <div className="text-gray-600 text-xs font-mono">{location.region}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-mono bg-black/60 border ${colors.border} rounded ${colors.text}`}>
                    {location.threats}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Stats Summary */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-red-950/30 to-black/60 border border-red-500/30 rounded-lg">
              <div className="text-2xl text-red-400 mb-1">{threatLocations.filter(l => l.threats > maxThreats * 0.7).length}</div>
              <div className="text-xs text-gray-500 font-mono">High Complaint Areas</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-950/30 to-black/60 border border-orange-500/30 rounded-lg">
              <div className="text-2xl text-orange-400 mb-1">{threatLocations.filter(l => l.threats > maxThreats * 0.4 && l.threats <= maxThreats * 0.7).length}</div>
              <div className="text-xs text-gray-500 font-mono">Medium Risk Areas</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-yellow-950/30 to-black/60 border border-yellow-500/30 rounded-lg">
              <div className="text-2xl text-yellow-400 mb-1">{threatLocations.filter(l => l.threats > maxThreats * 0.2 && l.threats <= maxThreats * 0.4).length}</div>
              <div className="text-xs text-gray-500 font-mono">Low Risk Areas</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-950/30 to-black/60 border border-emerald-500/30 rounded-lg">
              <div className="text-2xl text-emerald-400 mb-1">{threatLocations.reduce((sum, l) => sum + l.threats, 0)}</div>
              <div className="text-xs text-gray-500 font-mono">Total Complaints</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
