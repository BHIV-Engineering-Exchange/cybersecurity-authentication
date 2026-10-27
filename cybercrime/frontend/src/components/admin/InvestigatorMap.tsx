import { MapPin, User } from "lucide-react";
import { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";

interface InvestigatorLocation {
  id: number;
  email: string;
  full_name?: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface InvestigatorMapProps {
  investigators?: InvestigatorLocation[];
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export function InvestigatorMap({ investigators = [] }: InvestigatorMapProps) {
  const [hoveredInvestigator, setHoveredInvestigator] = useState<number | null>(null);

  // Filter investigators with valid coordinates
  const investigatorsWithLocations = investigators.filter(
    inv => inv.latitude !== null && inv.longitude !== null
  );

  return (
    <div>
      {/* Real World Map Container */}
      <div className="relative h-[500px] bg-black/60 border border-cyan-500/20 rounded-lg overflow-hidden mb-6">
        {/* Ambient glow effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(6,182,212,0.1),transparent_50%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(16,185,129,0.1),transparent_50%)] pointer-events-none"></div>

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
                    fill="rgba(6, 182, 212, 0.1)"
                    stroke="rgba(6, 182, 212, 0.3)"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { 
                        fill: "rgba(6, 182, 212, 0.2)", 
                        outline: "none",
                        transition: "all 0.3s"
                      },
                      pressed: { outline: "none" }
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Investigator Location Markers */}
            {investigatorsWithLocations.map((investigator) => {
              const isHovered = hoveredInvestigator === investigator.id;
              
              return (
                <Marker 
                  key={investigator.id} 
                  coordinates={[investigator.longitude!, investigator.latitude!]}
                >
                  <g
                    onMouseEnter={() => setHoveredInvestigator(investigator.id)}
                    onMouseLeave={() => setHoveredInvestigator(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Outer glow ring */}
                    <circle
                      r={isHovered ? 12 : 8}
                      fill="rgba(6, 182, 212, 0.2)"
                      className="animate-pulse"
                    />
                    {/* Main marker circle */}
                    <circle
                      r={isHovered ? 8 : 6}
                      fill="#06b6d4"
                      stroke="#0891b2"
                      strokeWidth={2}
                      className="transition-all duration-200"
                    />
                    {/* Inner dot */}
                    <circle
                      r={isHovered ? 4 : 3}
                      fill="#ffffff"
                      className="transition-all duration-200"
                    />
                  </g>
                  
                  {/* Tooltip */}
                  {isHovered && (
                    <text
                      textAnchor="middle"
                      y={-20}
                      style={{
                        fontFamily: "monospace",
                        fill: "#06b6d4",
                        fontSize: "12px",
                        fontWeight: "bold",
                        pointerEvents: "none",
                      }}
                    >
                      {investigator.full_name || investigator.email}
                    </text>
                  )}
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Controls Hint */}
        <div className="absolute top-4 right-4 bg-black/80 border border-cyan-500/30 rounded-lg px-3 py-2 backdrop-blur-xl z-10">
          <p className="text-xs text-cyan-400 font-mono">🖱️ Scroll to zoom • Drag to pan</p>
        </div>

        {/* Empty State */}
        {investigatorsWithLocations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 font-mono">No investigator locations available</p>
              <p className="text-gray-600 text-xs font-mono mt-1">
                Investigators with location data will appear here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Investigator Locations List */}
      {investigatorsWithLocations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {investigatorsWithLocations.map((investigator) => {
            const isHovered = hoveredInvestigator === investigator.id;
            return (
              <div 
                key={investigator.id}
                onMouseEnter={() => setHoveredInvestigator(investigator.id)}
                onMouseLeave={() => setHoveredInvestigator(null)}
                className={`flex items-center gap-3 p-3 bg-black/40 border rounded-lg transition-all cursor-pointer ${
                  isHovered 
                    ? "border-cyan-400 bg-cyan-950/20" 
                    : "border-cyan-500/30"
                }`}
              >
                <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                  <User className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-cyan-400 font-mono text-sm truncate">
                    {investigator.full_name || investigator.email}
                  </p>
                  <p className="text-gray-400 font-mono text-xs truncate">
                    {investigator.city && investigator.country 
                      ? `${investigator.city}, ${investigator.country}`
                      : investigator.city || investigator.country || "Unknown location"}
                  </p>
                  <p className="text-gray-500 font-mono text-xs mt-1">
                    {investigator.latitude?.toFixed(4)}, {investigator.longitude?.toFixed(4)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
