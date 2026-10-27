import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Users,
  Trash2,
  RefreshCw,
  Search,
  Mail,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  MapPin
} from "lucide-react";
import { apiUrl, getAuthHeaders } from "@/lib/api";

interface Investigator {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  location_city: string | null;
  location_country: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  location_ip: string | null;
  created_at: string | null;
}

export function InvestigatorsManagementContent() {
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchInvestigators();
  }, []);

  const fetchInvestigators = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl("investigators/investigators"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        // Filter out superadmin account (extra safety check)
        const superadminEmail = "blackholeinfiverse48@gmail.com".toLowerCase();
        const filtered = (data.investigators || []).filter(
          (inv: Investigator) => inv.email.toLowerCase() !== superadminEmail
        );
        setInvestigators(filtered);
      } else {
        console.error("Failed to fetch investigators");
      }
    } catch (error) {
      console.error("Error fetching investigators:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteInvestigator = async (id: number, email: string) => {
    // Prevent deleting superadmin account
    const superadminEmail = "blackholeinfiverse48@gmail.com".toLowerCase();
    if (email.toLowerCase() === superadminEmail) {
      alert("Error: Cannot delete superadmin account.");
      return;
    }

    if (!confirm(`Are you sure you want to delete investigator ${email}? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(id);
    try {
      const response = await fetch(apiUrl(`investigators/investigators/${id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Success: ${data.message}`);
        fetchInvestigators(); // Refresh the list
      } else {
        alert(`Error: ${data.detail || data.message || "Failed to delete investigator"}`);
      }
    } catch (error: any) {
      console.error("Error deleting investigator:", error);
      alert("Error deleting investigator. Please try again.");
    } finally {
      setDeleteLoading(null);
    }
  };


  // Filter investigators based on search query
  const filteredInvestigators = investigators.filter((inv) => {
    const query = searchQuery.toLowerCase();
    return (
      inv.email.toLowerCase().includes(query) ||
      (inv.full_name && inv.full_name.toLowerCase().includes(query))
    );
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Investigators Management
          </h1>
          <p className="text-gray-500 font-mono text-sm">Manage all investigator accounts</p>
        </div>
        <Button
          onClick={fetchInvestigators}
          disabled={loading}
          className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/60 font-mono"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/40 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-gray-400 font-mono text-xs">Total Investigators</p>
                <p className="text-emerald-400 font-mono text-2xl">{investigators.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-black/40 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-gray-400 font-mono text-xs">Active</p>
                <p className="text-cyan-400 font-mono text-2xl">
                  {investigators.filter((inv) => inv.is_active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-black/40 border border-gray-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-400 font-mono text-xs">Inactive</p>
                <p className="text-gray-400 font-mono text-2xl">
                  {investigators.filter((inv) => !inv.is_active).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg text-purple-400 font-mono">Important Notes</h3>
        </div>
        <ul className="space-y-2 text-gray-400 font-mono text-sm">
          <li className="flex items-start gap-2">
            <span className="text-purple-400 mt-0.5">•</span>
            <span>The superadmin account (blackholeinfiverse48@gmail.com) cannot be deleted</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 mt-0.5">•</span>
            <span>Deleting an investigator will permanently remove their account and all associated data</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 mt-0.5">•</span>
            <span>Use the search bar to quickly find investigators by email or name</span>
          </li>
        </ul>
      </div>

      {/* Investigators Table */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg text-emerald-400 font-mono">Investigators List</h2>
          <span className="text-gray-500 font-mono text-sm">
            ({filteredInvestigators.length} of {investigators.length})
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <span className="ml-3 text-gray-400 font-mono text-sm">Loading investigators...</span>
          </div>
        ) : filteredInvestigators.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 font-mono text-sm">
              {searchQuery ? "No investigators found matching your search" : "No investigators found"}
            </p>
            {searchQuery && (
              <Button
                onClick={() => setSearchQuery("")}
                className="mt-4 bg-gray-800 border border-gray-600 text-gray-300 hover:text-white font-mono text-sm"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-emerald-500/20">
                  <th className="text-left py-3 px-4 text-emerald-400 font-mono text-sm">ID</th>
                  <th className="text-left py-3 px-4 text-emerald-400 font-mono text-sm">Email</th>
                  <th className="text-left py-3 px-4 text-emerald-400 font-mono text-sm">Name</th>
                  <th className="text-left py-3 px-4 text-emerald-400 font-mono text-sm">Location</th>
                  <th className="text-left py-3 px-4 text-emerald-400 font-mono text-sm">Status</th>
                  <th className="text-left py-3 px-4 text-emerald-400 font-mono text-sm">Created</th>
                  <th className="text-right py-3 px-4 text-emerald-400 font-mono text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvestigators.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="text-gray-400 font-mono text-sm">#{inv.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-cyan-400" />
                        <span className="text-gray-200 font-mono text-sm">{inv.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-300 font-mono text-sm">
                          {inv.full_name || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {inv.location_city || inv.location_country || inv.location_latitude ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-cyan-400" />
                            <span className="text-gray-300 font-mono text-sm">
                              {inv.location_city && inv.location_country
                                ? `${inv.location_city}, ${inv.location_country}`
                                : inv.location_city || inv.location_country || "Unknown"}
                            </span>
                          </div>
                          {inv.location_latitude && inv.location_longitude && (
                            <div className="text-xs text-cyan-500/70 font-mono ml-6">
                              📍 {inv.location_latitude.toFixed(4)}, {inv.location_longitude.toFixed(4)}
                            </div>
                          )}
                          {inv.location_ip && (
                            <div className="text-xs text-gray-500 font-mono ml-6">
                              IP: {inv.location_ip}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 font-mono text-sm">No location data</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {inv.is_active ? (
                        <span className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded font-mono">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-950/40 border border-gray-500/30 text-gray-400 text-xs rounded font-mono">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-400 font-mono text-xs">
                        {formatDate(inv.created_at)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => deleteInvestigator(inv.id, inv.email)}
                          disabled={deleteLoading === inv.id}
                          className="bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-950/60 font-mono text-xs px-3 py-1.5"
                        >
                          {deleteLoading === inv.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
