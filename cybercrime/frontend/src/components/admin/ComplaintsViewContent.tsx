import { useState, useEffect } from "react";
import { Phone, MapPin, Calendar, Search, Filter, FileText, AlertCircle, CheckCircle, Clock, XCircle, X, Eye, Mail, PhoneCall as PhoneIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiUrl, getAuthHeaders } from "@/lib/api";

interface Complaint {
  id: number;
  wallet_address: string;
  investigator_id: number | null;
  investigator_name: string | null;
  investigator_email: string | null;
  officer_designation: string;
  officer_address: string | null;
  officer_email: string[] | null;
  officer_mobile: string[] | null;
  officer_telephone: string[] | null;
  incident_description: string;
  internal_notes: string | null;
  evidence_ids: number[] | null;
  status: string;
  created_at: string;
  investigator_location_city: string | null;
  investigator_location_country: string | null;
  investigator_location_latitude: number | null;
  investigator_location_longitude: number | null;
  investigator_location_ip: string | null;
}

interface Investigator {
  id: number;
  email: string;
  full_name: string | null;
}

type InvestigatorDisplay = {
  primary: string;
  secondary: string | null;
};

const looksLikeLegacyLocationText = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (v.includes("(") || v.includes(",")) return true;
  return (
    v.toLowerCase().includes(" pradesh") ||
    v.toLowerCase().includes("nadu") ||
    v.toLowerCase().includes("sikkim")
  );
};

export function ComplaintsViewContent() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);

  useEffect(() => {
    fetchComplaints();
    fetchInvestigators();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl("complaints/"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setComplaints(data);
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestigators = async () => {
    try {
      const response = await fetch(apiUrl("investigators/investigators"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setInvestigators(data.investigators || []);
      }
    } catch (error) {
      console.error("Error fetching investigators:", error);
    }
  };

  const filteredComplaints = complaints.filter((complaint) => {
    const investigator = complaint.investigator_id
      ? investigators.find((inv) => inv.id === complaint.investigator_id)
      : undefined;
    const investigatorNameOrEmail = investigator
      ? (investigator.full_name || investigator.email || "").toLowerCase()
      : "";
    const matchesSearch =
      complaint.wallet_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investigatorNameOrEmail.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || complaint.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted":
        return <Clock className="w-4 h-4 text-blue-400" />;
      case "under_review":
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "closed":
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-950/40 border-blue-500/30 text-blue-400";
      case "under_review":
        return "bg-yellow-950/40 border-yellow-500/30 text-yellow-400";
      case "resolved":
        return "bg-green-950/40 border-green-500/30 text-green-400";
      case "closed":
        return "bg-gray-950/40 border-gray-500/30 text-gray-400";
      default:
        return "bg-gray-950/40 border-gray-500/30 text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getInvestigatorDisplay = (complaint: Complaint): InvestigatorDisplay => {
    const apiName = complaint.investigator_name?.trim() || null;
    const apiEmail = complaint.investigator_email?.trim() || null;
    // Accept backend investigator_name only when it is tied to real identity signals.
    if (apiName && !looksLikeLegacyLocationText(apiName)) {
      return {
        primary: apiName,
        secondary: apiEmail && apiEmail !== apiName ? apiEmail : null,
      };
    }

    if (apiEmail) {
      return { primary: apiEmail, secondary: null };
    }

    if (complaint.investigator_id) {
      const inv = investigators.find((i) => i.id === complaint.investigator_id);
      if (inv) {
        const fullName = inv.full_name?.trim() || null;
        const email = inv.email?.trim() || null;
        return {
          primary: fullName || email || "Investigator linked",
          secondary: fullName && email && email !== fullName ? email : null,
        };
      }
    }

    // Legacy records may not carry investigator linkage.
    return {
      primary: "Investigator not linked",
      secondary: "Legacy complaint record",
    };
  };

  const getLocationFallbackLabel = (complaint: Complaint): string | null => {
    const hasStructuredLocation =
      Boolean(complaint.investigator_location_city) ||
      Boolean(complaint.investigator_location_country) ||
      complaint.investigator_location_latitude !== null ||
      complaint.investigator_location_longitude !== null ||
      Boolean(complaint.investigator_location_ip);
    if (hasStructuredLocation) return null;
    if (complaint.investigator_id !== null) return null;
    const raw = complaint.investigator_name?.trim() || null;
    return looksLikeLegacyLocationText(raw) ? raw : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-emerald-400 font-mono mb-2">Filed Complaints</h2>
            <p className="text-gray-500 font-mono text-sm">View all wallet complaints filed by investigators with location tracking</p>
          </div>
          <Button
            onClick={fetchComplaints}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-mono text-xs mb-1">Total Complaints</p>
              <p className="text-2xl text-emerald-400 font-mono">{complaints.length}</p>
            </div>
            <FileText className="w-8 h-8 text-emerald-400/30" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-mono text-xs mb-1">Submitted</p>
              <p className="text-2xl text-blue-400 font-mono">
                {complaints.filter((c) => c.status === "submitted").length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-400/30" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-mono text-xs mb-1">Under Review</p>
              <p className="text-2xl text-yellow-400 font-mono">
                {complaints.filter((c) => c.status === "under_review").length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-400/30" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-mono text-xs mb-1">Resolved</p>
              <p className="text-2xl text-green-400 font-mono">
                {complaints.filter((c) => c.status === "resolved").length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400/30" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-4">
        <div className="flex gap-4 flex-col sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search by wallet address or officer designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/60 border-emerald-500/40 text-gray-100 placeholder:text-gray-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-black/60 border-emerald-500/40 text-gray-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-emerald-500/40">
              <SelectItem value="all" className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer">
                All Status
              </SelectItem>
              <SelectItem value="submitted" className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer">
                Submitted
              </SelectItem>
              <SelectItem value="under_review" className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer">
                Under Review
              </SelectItem>
              <SelectItem value="resolved" className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer">
                Resolved
              </SelectItem>
              <SelectItem value="closed" className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer">
                Closed
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-gray-500 font-mono text-sm">Loading complaints...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <FileText className="w-12 h-12 text-gray-600" />
            <p className="text-gray-500 font-mono">No complaints found</p>
            <p className="text-xs text-gray-600 font-mono">
              {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "No complaints have been filed yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-emerald-500/20">
                  <th className="text-left py-3 px-4 text-gray-400 font-mono text-xs uppercase">ID</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-mono text-xs uppercase">Wallet Address</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-mono text-xs uppercase">Investigator</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-mono text-xs uppercase">Investigator Location</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-mono text-xs uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-mono text-xs uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-mono text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((complaint) => (
                  <tr
                    key={complaint.id}
                    className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedComplaint(complaint)}
                  >
                    <td className="py-4 px-4">
                      <span className="text-gray-300 font-mono text-sm">#{complaint.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-emerald-400 font-mono text-sm" title={complaint.wallet_address}>
                        {complaint.wallet_address.length > 20
                          ? `${complaint.wallet_address.substring(0, 20)}...`
                          : complaint.wallet_address}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {(() => {
                        const display = getInvestigatorDisplay(complaint);
                        return (
                          <div>
                            <p className="text-gray-200 font-mono text-sm">{display.primary}</p>
                            {display.secondary && (
                              <p className="text-gray-500 font-mono text-xs mt-1">{display.secondary}</p>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-4">
                      {complaint.investigator_location_city ||
                      complaint.investigator_location_country ||
                      complaint.investigator_location_latitude !== null ||
                      complaint.investigator_location_longitude !== null ||
                      complaint.investigator_location_ip ||
                      getLocationFallbackLabel(complaint) ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-cyan-400" />
                          <div>
                            {(complaint.investigator_location_city || complaint.investigator_location_country) && (
                              <p className="text-gray-200 font-mono text-sm">
                                {complaint.investigator_location_city || "Unknown City"}
                                {complaint.investigator_location_country && `, ${complaint.investigator_location_country}`}
                              </p>
                            )}
                            {!complaint.investigator_location_city &&
                              !complaint.investigator_location_country &&
                              getLocationFallbackLabel(complaint) && (
                              <p className="text-gray-200 font-mono text-sm">
                                {getLocationFallbackLabel(complaint)}
                              </p>
                            )}
                            {complaint.investigator_location_latitude !== null &&
                              complaint.investigator_location_longitude !== null && (
                              <p className="text-gray-500 font-mono text-xs mt-1">
                                {complaint.investigator_location_latitude.toFixed(4)}, {complaint.investigator_location_longitude.toFixed(4)}
                              </p>
                            )}
                            {!complaint.investigator_location_city &&
                              !complaint.investigator_location_country &&
                              getLocationFallbackLabel(complaint) && (
                              <p className="text-gray-600 font-mono text-xs mt-1">Legacy location record</p>
                            )}
                            {complaint.investigator_location_ip && (
                              <p className="text-gray-600 font-mono text-xs mt-1">IP: {complaint.investigator_location_ip}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-600 font-mono text-sm">Not detected</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded border font-mono text-xs ${getStatusColor(complaint.status)}`}>
                        {getStatusIcon(complaint.status)}
                        <span className="capitalize">{complaint.status.replace("_", " ")}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-400 font-mono text-sm">{formatDate(complaint.created_at)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComplaint(complaint);
                        }}
                        className="h-8 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-mono"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-emerald-500/30 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-emerald-500/30 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl text-emerald-400 font-mono mb-1">Complaint Details</h3>
                <p className="text-gray-500 font-mono text-sm">ID: #{selectedComplaint.id}</p>
              </div>
              <Button
                onClick={() => setSelectedComplaint(null)}
                className="h-8 w-8 p-0 bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded border font-mono text-sm ${getStatusColor(selectedComplaint.status)}`}>
                  {getStatusIcon(selectedComplaint.status)}
                  <span className="capitalize">{selectedComplaint.status.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 font-mono text-sm">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedComplaint.created_at)}
                </div>
              </div>

              {/* Wallet Address */}
              <div className="bg-black/40 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-gray-500 font-mono text-xs mb-2">Wallet Address</p>
                <p className="text-emerald-400 font-mono text-sm break-all">{selectedComplaint.wallet_address}</p>
              </div>

              {/* Officer Information */}
              <div className="bg-black/40 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-gray-500 font-mono text-xs mb-3">Officer Information</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 font-mono text-xs mb-1">Designation</p>
                    <p className="text-gray-200 font-mono text-sm">{selectedComplaint.officer_designation}</p>
                  </div>
                  {selectedComplaint.officer_address && (
                    <div>
                      <p className="text-gray-400 font-mono text-xs mb-1">Address</p>
                      <p className="text-gray-200 font-mono text-sm">{selectedComplaint.officer_address}</p>
                    </div>
                  )}
                  {selectedComplaint.officer_email && selectedComplaint.officer_email.length > 0 && (
                    <div>
                      <p className="text-gray-400 font-mono text-xs mb-1 flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        Email
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedComplaint.officer_email.map((email, idx) => (
                          <a
                            key={idx}
                            href={`mailto:${email}`}
                            className="text-cyan-400 hover:text-cyan-300 font-mono text-sm underline"
                          >
                            {email}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedComplaint.officer_mobile && selectedComplaint.officer_mobile.length > 0 && (
                    <div>
                      <p className="text-gray-400 font-mono text-xs mb-1 flex items-center gap-2">
                        <PhoneIcon className="w-3 h-3" />
                        Mobile
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedComplaint.officer_mobile.map((mobile, idx) => (
                          <a
                            key={idx}
                            href={`tel:${mobile}`}
                            className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
                          >
                            {mobile}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedComplaint.officer_telephone && selectedComplaint.officer_telephone.length > 0 && (
                    <div>
                      <p className="text-gray-400 font-mono text-xs mb-1 flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        Telephone
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedComplaint.officer_telephone.map((tel, idx) => (
                          <a
                            key={idx}
                            href={`tel:${tel}`}
                            className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
                          >
                            {tel}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Incident Description */}
              <div className="bg-black/40 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-gray-500 font-mono text-xs mb-3">Incident Description</p>
                <p className="text-gray-200 font-mono text-sm whitespace-pre-wrap">{selectedComplaint.incident_description}</p>
              </div>

              {/* Internal Notes */}
              {selectedComplaint.internal_notes && (
                <div className="bg-black/40 border border-cyan-500/30 rounded-lg p-4">
                  <p className="text-gray-500 font-mono text-xs mb-3">Internal Notes</p>
                  <p className="text-gray-200 font-mono text-sm whitespace-pre-wrap">{selectedComplaint.internal_notes}</p>
                </div>
              )}

              {/* Evidence IDs */}
              {selectedComplaint.evidence_ids && selectedComplaint.evidence_ids.length > 0 && (
                <div className="bg-black/40 border border-emerald-500/30 rounded-lg p-4">
                  <p className="text-gray-500 font-mono text-xs mb-3">Attached Evidence</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedComplaint.evidence_ids.map((evidenceId) => (
                      <span
                        key={evidenceId}
                        className="px-3 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded font-mono text-xs"
                      >
                        Evidence #{evidenceId}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Investigator Location */}
              {(selectedComplaint.investigator_location_city || selectedComplaint.investigator_location_country) && (
                <div className="bg-black/40 border border-cyan-500/30 rounded-lg p-4">
                  <p className="text-gray-500 font-mono text-xs mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Investigator Location (Auto-Detected)
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-gray-400 font-mono text-xs mb-1">Location</p>
                      <p className="text-gray-200 font-mono text-sm">
                        {selectedComplaint.investigator_location_city || "Unknown City"}
                        {selectedComplaint.investigator_location_country && `, ${selectedComplaint.investigator_location_country}`}
                      </p>
                    </div>
                    {selectedComplaint.investigator_location_latitude && selectedComplaint.investigator_location_longitude && (
                      <div>
                        <p className="text-gray-400 font-mono text-xs mb-1">Coordinates</p>
                        <p className="text-gray-200 font-mono text-sm">
                          {selectedComplaint.investigator_location_latitude.toFixed(6)}, {selectedComplaint.investigator_location_longitude.toFixed(6)}
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${selectedComplaint.investigator_location_latitude},${selectedComplaint.investigator_location_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 font-mono text-xs underline mt-1 inline-block"
                        >
                          View on Google Maps
                        </a>
                      </div>
                    )}
                    {selectedComplaint.investigator_location_ip && (
                      <div>
                        <p className="text-gray-400 font-mono text-xs mb-1">IP Address</p>
                        <p className="text-gray-200 font-mono text-sm">{selectedComplaint.investigator_location_ip}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-xl border-t border-emerald-500/30 p-4 flex justify-end">
              <Button
                onClick={() => setSelectedComplaint(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
