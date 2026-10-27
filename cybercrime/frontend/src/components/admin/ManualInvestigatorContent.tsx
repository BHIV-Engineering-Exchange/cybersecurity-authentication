import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { 
  UserPlus, 
  Database, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Link as LinkIcon,
  Copy,
  Check,
  Shield,
  UserCog,
  Trash2,
  Users,
  AlertTriangle,
  MapPin
} from "lucide-react";
import { InvestigatorMap } from "./InvestigatorMap";

import { apiUrl, getAuthHeaders } from "@/lib/api";
interface DatabaseStatus {
  connected: boolean;
  database_type: string;
  message: string;
}

interface EmailResponse {
  success: boolean;
  message: string;
  user_id?: number;
  email?: string;
  reset_link?: string;
}

export function ManualInvestigatorContent() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationIP, setLocationIP] = useState("");
  const [geocodingLocation, setGeocodingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [emailResult, setEmailResult] = useState<EmailResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [superadminLoading, setSuperadminLoading] = useState(false);
  const [superadminResult, setSuperadminResult] = useState<{success: boolean; message: string} | null>(null);
  const [investigators, setInvestigators] = useState<any[]>([]);
  const [investigatorsLoading, setInvestigatorsLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    checkDatabaseStatus();
    fetchInvestigators();
  }, []);

  const checkDatabaseStatus = async () => {
    setDbLoading(true);
    try {
      const response = await fetch(apiUrl("investigators/database/status"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setDbStatus(data);
      } else {
        setDbStatus({
          connected: false,
          database_type: "Unknown",
          message: "Failed to check database status"
        });
      }
    } catch (error) {
      setDbStatus({
        connected: false,
        database_type: "Unknown",
        message: "Error connecting to database"
      });
    } finally {
      setDbLoading(false);
    }
  };

  const geocodeLocation = async () => {
    if (!locationCity.trim() && !locationCountry.trim()) {
      alert("Please enter at least a city or country");
      return;
    }

    setGeocodingLocation(true);
    try {
      // Use Nominatim (OpenStreetMap) free geocoding API
      const query = [locationCity.trim(), locationCountry.trim()].filter(Boolean).join(", ");
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Cybercrime Portal' // Required by Nominatim
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          setLocationLat(parseFloat(result.lat));
          setLocationLng(parseFloat(result.lon));
          // Update city/country if they were empty
          if (!locationCity.trim() && result.address) {
            setLocationCity(result.address.city || result.address.town || result.address.village || "");
          }
          if (!locationCountry.trim() && result.address) {
            setLocationCountry(result.address.country || "");
          }
        } else {
          alert("Location not found. Please check the city and country names.");
        }
      } else {
        alert("Failed to geocode location. Please enter coordinates manually.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      alert("Error geocoding location. Please enter coordinates manually.");
    } finally {
      setGeocodingLocation(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      alert("Please enter an email address");
      return;
    }

    setLoading(true);
    setEmailResult(null);
    try {
      const response = await fetch(apiUrl("investigators/send-welcome-email"), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          location_city: locationCity.trim() || undefined,
          location_country: locationCountry.trim() || undefined,
          location_latitude: locationLat || undefined,
          location_longitude: locationLng || undefined,
          location_ip: locationIP.trim() || undefined,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, try to get text response
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text || response.statusText}`);
      }

      if (response.ok) {
        setEmailResult(data);
        setEmail("");
        setName("");
        setLocationCity("");
        setLocationCountry("");
        setLocationLat(null);
        setLocationLng(null);
        setLocationIP("");
        fetchInvestigators(); // Refresh the investigators list
      } else {
        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : Array.isArray(data?.detail)
              ? data.detail.map((d: any) => d?.msg || JSON.stringify(d)).join(", ")
              : undefined;
        const message =
          typeof data?.message === "string"
            ? data.message
            : undefined;
        setEmailResult({
          success: false,
          message:
            detail ||
            message ||
            `Failed to send email (Status: ${response.status}). Please check Brevo API configuration.`,
        });
      }
    } catch (error: any) {
      console.error("Error sending email:", error);
      setEmailResult({
        success: false,
        message: error?.message || "Error sending email. Please check your network connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initSuperadmin = async () => {
    setSuperadminLoading(true);
    setSuperadminResult(null);
    try {
      const response = await fetch(apiUrl("investigators/init-superadmin"), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (response.ok) {
        setSuperadminResult({
          success: true,
          message: data.message || "Superadmin account created successfully"
        });
      } else {
        setSuperadminResult({
          success: false,
          message: data.detail || data.message || "Failed to create superadmin account"
        });
      }
    } catch (error: any) {
      console.error("Error initializing superadmin:", error);
      setSuperadminResult({
        success: false,
        message: error?.message || "Error creating superadmin account. Please try again."
      });
    } finally {
      setSuperadminLoading(false);
    }
  };

  const fetchInvestigators = async () => {
    setInvestigatorsLoading(true);
    try {
      const response = await fetch(apiUrl("investigators/investigators"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setInvestigators(data.investigators || []);
      }
    } catch (error) {
      console.error("Error fetching investigators:", error);
    } finally {
      setInvestigatorsLoading(false);
    }
  };

  const deleteAllInvestigators = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(apiUrl("investigators/delete-all-investigators"), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Success: ${data.message}`);
        setShowDeleteConfirm(false);
        fetchInvestigators(); // Refresh the list
      } else {
        alert(`Error: ${data.detail || data.message || "Failed to delete investigators"}`);
      }
    } catch (error: any) {
      console.error("Error deleting investigators:", error);
      alert("Error deleting investigators. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Manual Investigator
          </h1>
          <p className="text-gray-500 font-mono text-sm">Add investigators and send welcome emails</p>
        </div>
      </div>

      {/* Superadmin Information Card */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg text-purple-400 font-mono">Superadmin Account</h2>
        </div>
        <div className="bg-purple-950/20 border border-purple-500/30 rounded-lg p-4 mb-4">
          <p className="text-purple-400 font-mono text-sm mb-2">Permanent Superadmin Credentials:</p>
          <div className="space-y-1 text-gray-300 font-mono text-xs mb-3">
            <p><span className="text-purple-400">Email:</span> blackholeinfiverse48@gmail.com</p>
            <p><span className="text-purple-400">Password:</span> admin</p>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded p-2 mt-3">
            <p className="text-emerald-400 font-mono text-xs">
              ✓ Account is automatically created on server startup
            </p>
            <p className="text-gray-400 font-mono text-xs mt-1">
              This is a permanent system account and cannot be deleted
            </p>
          </div>
        </div>
        <Button
          onClick={initSuperadmin}
          disabled={superadminLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-mono disabled:opacity-50"
        >
          {superadminLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <UserCog className="w-4 h-4 mr-2" />
              Verify/Reset Superadmin Account
            </>
          )}
        </Button>
        {superadminResult && (
          <div className={`mt-4 p-4 rounded-lg border ${
            superadminResult.success
              ? "bg-emerald-950/20 border-emerald-500/30"
              : "bg-red-950/20 border-red-500/30"
          }`}>
            <div className="flex items-start gap-3">
              {superadminResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
              )}
              <p className={`font-mono text-sm ${
                superadminResult.success ? "text-emerald-400" : "text-red-400"
              }`}>
                {superadminResult.message}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Database Status Card */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg text-cyan-400 font-mono">Database Connection</h2>
        </div>
        {dbLoading ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            <span className="text-gray-400 font-mono text-sm">Checking connection...</span>
          </div>
        ) : dbStatus ? (
          <div className="flex items-center gap-3">
            {dbStatus.connected ? (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-emerald-400 font-mono text-sm">
                    Database connection successful
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-red-400 font-mono text-sm">Database connection failed</p>
                </div>
              </>
            )}
          </div>
        ) : null}
        <Button
          onClick={checkDatabaseStatus}
          className="mt-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/60 font-mono text-sm"
        >
          <Database className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Send Welcome Email Card */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg text-emerald-400 font-mono">Send Welcome Email</h2>
        </div>

        <form onSubmit={handleSendEmail} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-300 font-mono mb-2 block">
              Investigator Name (Optional)
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter investigator name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 font-mono"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-300 font-mono mb-2 block">
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="investigator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 font-mono"
            />
          </div>

          {/* Location Section */}
          <div className="space-y-4 p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-lg">
            <Label className="text-cyan-400 font-mono text-sm">Location Information</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="locationCity" className="text-gray-300 font-mono text-xs mb-1 block">
                  City
                </Label>
                <Input
                  id="locationCity"
                  type="text"
                  placeholder="City"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  className="bg-black/60 border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:border-cyan-400 font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="locationCountry" className="text-gray-300 font-mono text-xs mb-1 block">
                  Country
                </Label>
                <Input
                  id="locationCountry"
                  type="text"
                  placeholder="Country"
                  value={locationCountry}
                  onChange={(e) => setLocationCountry(e.target.value)}
                  className="bg-black/60 border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:border-cyan-400 font-mono text-sm"
                />
              </div>
            </div>

            {/* Geocode Button */}
            <Button
              type="button"
              onClick={geocodeLocation}
              disabled={geocodingLocation || (!locationCity.trim() && !locationCountry.trim())}
              className="w-full bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-600/30 font-mono text-sm disabled:opacity-50"
            >
              {geocodingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Geocoding...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Get Location on Map
                </>
              )}
            </Button>
            
            {/* Manual Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="locationLat" className="text-gray-300 font-mono text-xs mb-1 block">
                  Latitude (optional)
                </Label>
                <Input
                  id="locationLat"
                  type="number"
                  step="any"
                  placeholder="e.g., 40.7128"
                  value={locationLat ?? ""}
                  onChange={(e) => setLocationLat(e.target.value ? parseFloat(e.target.value) : null)}
                  className="bg-black/60 border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:border-cyan-400 font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="locationLng" className="text-gray-300 font-mono text-xs mb-1 block">
                  Longitude (optional)
                </Label>
                <Input
                  id="locationLng"
                  type="number"
                  step="any"
                  placeholder="e.g., -74.0060"
                  value={locationLng ?? ""}
                  onChange={(e) => setLocationLng(e.target.value ? parseFloat(e.target.value) : null)}
                  className="bg-black/60 border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:border-cyan-400 font-mono text-sm"
                />
              </div>
            </div>
            
            {(locationLat !== null && locationLng !== null) && (
              <div className="text-xs text-cyan-400 font-mono p-2 bg-cyan-950/40 rounded border border-cyan-500/30">
                ✓ Location marked: {locationLat.toFixed(4)}, {locationLng.toFixed(4)}
              </div>
            )}
          </div>

          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-lg p-4">
            <p className="text-cyan-400 font-mono text-sm mb-2">What will be sent:</p>
            <ul className="space-y-1 text-gray-300 font-mono text-xs ml-4">
              <li>• Auto-generated unique password</li>
              <li>• Welcome message with login credentials</li>
              <li>• Password reset link</li>
            </ul>
          </div>

          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-mono disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Send Welcome Email
              </>
            )}
          </Button>
        </form>

        {/* Email Result */}
        {emailResult && (
          <div className={`mt-6 p-4 rounded-lg border ${
            emailResult.success
              ? "bg-emerald-950/20 border-emerald-500/30"
              : "bg-red-950/20 border-red-500/30"
          }`}>
            <div className="flex items-start gap-3">
              {emailResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-mono text-sm mb-2 ${
                  emailResult.success ? "text-emerald-400" : "text-red-400"
                }`}>
                  {emailResult.message}
                </p>

                {emailResult.success && emailResult.reset_link && (
                  <div className="mt-4">
                    <div className="bg-black/40 p-3 rounded border border-cyan-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 font-mono text-xs flex items-center gap-2">
                          <LinkIcon className="w-3 h-3" />
                          Password Reset Link:
                        </span>
                        <button
                          onClick={() => copyToClipboard(emailResult.reset_link!)}
                          className="p-1 hover:bg-cyan-500/20 rounded transition"
                        >
                          {copied ? (
                            <Check className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <p className="text-cyan-400 font-mono text-xs break-all">{emailResult.reset_link}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Investigators List & Delete Section */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-red-400" />
            <h2 className="text-lg text-red-400 font-mono">Investigators Management</h2>
          </div>
          <Button
            onClick={fetchInvestigators}
            disabled={investigatorsLoading}
            className="bg-gray-800 border border-gray-600 text-gray-300 hover:text-white font-mono text-sm"
          >
            <Loader2 className={`w-4 h-4 mr-2 ${investigatorsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {investigatorsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            <span className="ml-3 text-gray-400 font-mono text-sm">Loading investigators...</span>
          </div>
        ) : investigators.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-mono text-sm">No investigators found</p>
            <p className="text-gray-600 font-mono text-xs mt-1">Create investigators using the form above</p>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 bg-red-950/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 font-mono text-sm mb-1">
                Total Investigators: <span className="text-white">{investigators.length}</span>
              </p>
            </div>

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {investigators.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 bg-black/40 border border-gray-700/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 font-mono text-sm truncate">{inv.email}</p>
                    {inv.full_name && (
                      <p className="text-gray-500 font-mono text-xs">{inv.full_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.is_active ? (
                      <span className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded font-mono">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-950/40 border border-gray-500/30 text-gray-400 text-xs rounded font-mono">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-red-500/20 pt-4">
              {showDeleteConfirm ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-red-950/20 border border-red-500/30 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-400 font-mono text-sm mb-1">
                        Warning: This will delete ALL {investigators.length} investigator account(s)
                      </p>
                      <p className="text-gray-400 font-mono text-xs">
                        This action cannot be undone. The superadmin account will not be affected.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={deleteAllInvestigators}
                      disabled={deleteLoading}
                      className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 font-mono"
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Confirm Delete All
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleteLoading}
                      className="bg-gray-800 border border-gray-600 text-gray-300 hover:text-white font-mono"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={investigators.length === 0}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 font-mono disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Investigators ({investigators.length})
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Investigator Locations Map */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg text-cyan-400 font-mono">Investigator Locations Map</h2>
        </div>
        <p className="text-gray-400 font-mono text-sm mb-4">
          View all investigators marked on the world map. Hover over markers to see investigator details.
        </p>
        <InvestigatorMap 
          investigators={investigators.map(inv => ({
            id: inv.id,
            email: inv.email,
            full_name: inv.full_name,
            city: inv.location_city,
            country: inv.location_country,
            latitude: inv.location_latitude,
            longitude: inv.location_longitude,
          }))} 
        />
      </div>
    </div>
  );
}
