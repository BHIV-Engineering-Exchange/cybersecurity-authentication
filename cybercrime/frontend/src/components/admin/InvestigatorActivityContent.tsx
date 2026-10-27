import { useState, useEffect } from "react";
import { 
  Activity, 
  Upload, 
  FileText, 
  Bot, 
  Eye, 
  Calendar, 
  Clock, 
  TrendingUp,
  Users,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Search,
  User,
  ExternalLink,
  MapPin,
  Mail
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { apiUrl, getAuthHeaders } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface Investigator {
  id: number;
  email: string;
  full_name: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  last_activity_at?: string | null;
  created_at?: string | null;
  evidence_count?: number;
  watchlist_count?: number;
  last_activity?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  location_ip?: string | null;
}

interface ActivityData {
  investigator: {
    id: number;
    email: string;
    full_name: string | null;
    is_active: boolean;
    last_login_at: string | null;
    last_activity_at: string | null;
    created_at: string | null;
  };
  statistics: {
    evidence: { today: number; week: number; month: number; total: number };
    complaints: { today: number; week: number; month: number; total: number };
    incident_reports: { today: number; week: number; month: number; total: number };
    watchlist: { today: number; week: number; month: number; total: number };
  };
  activity_timeline: Array<{
    type: string;
    action: string;
    description: string;
    timestamp: string | null;
    entity_id: number;
  }>;
}

interface ActivityLog {
  type: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  timestamp: string | null;
  ip_address: string | null;
}

interface Evidence {
  id: number;
  evidence_id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

interface Complaint {
  id: number;
  wallet_address: string;
  officer_designation: string;
  incident_description: string;
  status: string;
  created_at: string;
}

interface IncidentReport {
  _id: string;
  wallet_address: string;
  risk_score: number;
  risk_level: string;
  status: string;
  created_at: string;
}

interface WatchlistWallet {
  id: number;
  wallet_address: string;
  label: string | null;
  last_risk_score: number | null;
  last_risk_level: string | null;
  created_at: string;
}

type MainTabType = "dashboard" | "logs" | "details";
type DetailTabType = "overview" | "evidence" | "complaints" | "reports" | "watchlist";

export function InvestigatorActivityContent() {
  const [activeTab, setActiveTab] = useState<MainTabType>("dashboard");
  const [detailTab, setDetailTab] = useState<DetailTabType>("overview");
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [selectedInvestigator, setSelectedInvestigator] = useState<number | null>(null);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [investigatorDetails, setInvestigatorDetails] = useState<Investigator | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "total">("total");
  
  // Logs filters
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [detailSearchQuery, setDetailSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchAllInvestigators();
  }, []);

  useEffect(() => {
    if (selectedInvestigator) {
      if (activeTab === "dashboard") {
        fetchInvestigatorActivity(selectedInvestigator);
      } else if (activeTab === "logs") {
        fetchActivityLogs();
      } else if (activeTab === "details") {
        fetchInvestigatorDetails();
        fetchAllDetailData();
      }
    }
  }, [selectedInvestigator, activeTab]);

  useEffect(() => {
    if (activeTab === "logs" && selectedInvestigator) {
      fetchActivityLogs();
    }
  }, [actionFilter, startDate, endDate]);

  useEffect(() => {
    if (activeTab === "details" && selectedInvestigator) {
      fetchAllDetailData();
    }
  }, [detailTab]);

  const fetchAllInvestigators = async () => {
    setLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      console.log("🔑 Fetching investigators - Auth headers:", { hasAuth: !!authHeaders["Authorization"] });
      const response = await fetch(apiUrl("investigators/activity/all"), { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setInvestigators(data.investigators || []);
        // Auto-select first investigator if available
        if (data.investigators && data.investigators.length > 0 && !selectedInvestigator) {
          setSelectedInvestigator(data.investigators[0].id);
        }
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch investigators:", response.status, errorText);
        if (response.status === 401) {
          console.error("❌ Authentication failed - token may be missing or expired");
        }
      }
    } catch (error) {
      console.error("Error fetching investigators:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestigatorActivity = async (investigatorId: number) => {
    setLoadingActivity(true);
    try {
      const response = await fetch(apiUrl(`investigators/${investigatorId}/activity`), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setActivityData(data);
      } else {
        console.error("Failed to fetch activity data");
      }
    } catch (error) {
      console.error("Error fetching activity data:", error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const fetchActivityLogs = async () => {
    if (!selectedInvestigator) return;
    
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== "all") {
        params.append("action_type", actionFilter);
      }
      if (startDate) {
        params.append("start_date", startDate);
      }
      if (endDate) {
        params.append("end_date", endDate);
      }
      
      const response = await fetch(
        apiUrl(`investigators/${selectedInvestigator}/activity-logs?${params.toString()}`)
      );
      
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.activities || []);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchInvestigatorDetails = async () => {
    if (!selectedInvestigator) return;
    
    try {
      const response = await fetch(apiUrl(`investigators/${selectedInvestigator}/activity`), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setInvestigatorDetails(data.investigator);
      }
    } catch (error) {
      console.error("Error fetching investigator details:", error);
    }
  };

  const fetchAllDetailData = async () => {
    if (!selectedInvestigator) return;
    
    setLoadingDetails(true);
    try {
      // Fetch evidence
      const evidenceRes = await fetch(apiUrl(`evidence/?investigator_id=${selectedInvestigator}`), { headers: getAuthHeaders() });
      if (evidenceRes.ok) {
        const evidenceData = await evidenceRes.json();
        setEvidence(evidenceData || []);
      }

      // Fetch complaints
      const complaintsRes = await fetch(apiUrl(`complaints/?investigator_id=${selectedInvestigator}`), { headers: getAuthHeaders() });
      if (complaintsRes.ok) {
        const complaintsData = await complaintsRes.json();
        setComplaints(complaintsData || []);
      }

      // Fetch incident reports
      const reportsRes = await fetch(apiUrl(`incidents/reports?investigator_id=${selectedInvestigator}`), { headers: getAuthHeaders() });
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData || []);
      }

      // Fetch watchlist
      const watchlistRes = await fetch(apiUrl(`watchlist/`), { headers: getAuthHeaders() });
      if (watchlistRes.ok) {
        const watchlistData = await watchlistRes.json();
        const filtered = (watchlistData || []).filter(
          (w: any) => w.created_by === selectedInvestigator
        );
        setWatchlist(filtered);
      }
    } catch (error) {
      console.error("Error fetching detail data:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const exportLogs = () => {
    if (activityLogs.length === 0) return;
    
    const csv = [
      ["Timestamp", "Action", "Type", "Entity ID", "Details", "IP Address"].join(","),
      ...activityLogs.map(log => [
        log.timestamp || "",
        `"${log.action}"`,
        log.type,
        log.entity_id,
        `"${log.details.replace(/"/g, '""')}"`,
        log.ip_address || ""
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investigator_${selectedInvestigator}_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      return formatDate(dateString);
    } catch {
      return dateString;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "evidence_upload":
        return Upload;
      case "watchlist_add":
        return Eye;
      case "complaint_filed":
        return FileText;
      case "incident_report":
        return Bot;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "evidence_upload":
        return "text-cyan-400 border-cyan-500/30 bg-cyan-950/20";
      case "watchlist_add":
        return "text-emerald-400 border-emerald-500/30 bg-emerald-950/20";
      case "complaint_filed":
        return "text-red-400 border-red-500/30 bg-red-950/20";
      case "incident_report":
        return "text-purple-400 border-purple-500/30 bg-purple-950/20";
      default:
        return "text-gray-400 border-gray-500/30 bg-gray-950/20";
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case "evidence_upload":
        return "cyan";
      case "complaint_filed":
        return "red";
      case "incident_report":
        return "purple";
      case "watchlist_add":
        return "emerald";
      default:
        return "gray";
    }
  };

  const getStatValue = (stat: { today: number; week: number; month: number; total: number }) => {
    switch (timeRange) {
      case "today":
        return stat.today;
      case "week":
        return stat.week;
      case "month":
        return stat.month;
      case "total":
        return stat.total;
      default:
        return stat.total;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "submitted":
      case "investigating":
        return "text-emerald-400 bg-emerald-950/20 border-emerald-500/30";
      case "inactive":
      case "under_review":
        return "text-yellow-400 bg-yellow-950/20 border-yellow-500/30";
      case "resolved":
      case "closed":
        return "text-blue-400 bg-blue-950/20 border-blue-500/30";
      default:
        return "text-gray-400 bg-gray-950/20 border-gray-500/30";
    }
  };

  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-emerald-400";
      default:
        return "text-gray-400";
    }
  };

  const filteredLogs = activityLogs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query) ||
      log.entity_id.toLowerCase().includes(query)
    );
  });

  const filteredDetailData = () => {
    if (!detailSearchQuery) {
      switch (detailTab) {
        case "evidence": return evidence;
        case "complaints": return complaints;
        case "reports": return reports;
        case "watchlist": return watchlist;
        default: return [];
      }
    }
    
    const query = detailSearchQuery.toLowerCase();
    switch (detailTab) {
      case "evidence":
        return evidence.filter(e => 
          e.title.toLowerCase().includes(query) || 
          e.evidence_id.toLowerCase().includes(query) ||
          (e.description && e.description.toLowerCase().includes(query))
        );
      case "complaints":
        return complaints.filter(c => 
          c.wallet_address.toLowerCase().includes(query) ||
          c.incident_description.toLowerCase().includes(query)
        );
      case "reports":
        return reports.filter(r => 
          r.wallet_address.toLowerCase().includes(query) ||
          r.risk_level.toLowerCase().includes(query)
        );
      case "watchlist":
        return watchlist.filter(w => 
          w.wallet_address.toLowerCase().includes(query) ||
          (w.label && w.label.toLowerCase().includes(query))
        );
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg border border-emerald-500/30">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl text-emerald-400 font-mono">Investigator Activity</h2>
              <p className="text-sm text-gray-500 font-mono">Monitor investigator activity and performance</p>
            </div>
          </div>
          <Button
            onClick={() => {
              if (activeTab === "dashboard") {
                fetchAllInvestigators();
                if (selectedInvestigator) {
                  fetchInvestigatorActivity(selectedInvestigator);
                }
              } else if (activeTab === "logs") {
                fetchActivityLogs();
              } else if (activeTab === "details") {
                fetchInvestigatorDetails();
                fetchAllDetailData();
              }
            }}
            variant="outline"
            className="bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Investigator Selector */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <Users className="w-5 h-5 text-emerald-400" />
          <label className="text-emerald-400 font-mono text-sm">Select Investigator:</label>
          <Select
            value={selectedInvestigator?.toString() || ""}
            onValueChange={(value) => setSelectedInvestigator(parseInt(value))}
          >
            <SelectTrigger className="w-64 bg-black/60 border-emerald-500/40 text-gray-100">
              <SelectValue placeholder="Select an investigator" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-emerald-500/40">
              {investigators.map((inv) => (
                <SelectItem
                  key={inv.id}
                  value={inv.id.toString()}
                  className="font-mono text-gray-300 focus:bg-emerald-950/40 cursor-pointer"
                >
                  {inv.full_name || inv.email} {inv.is_active ? "✓" : "✗"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-emerald-500/20">
          {[
            { id: "dashboard" as MainTabType, label: "Dashboard", icon: Activity },
            { id: "logs" as MainTabType, label: "Activity Logs", icon: FileText },
            { id: "details" as MainTabType, label: "Details", icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 font-mono text-sm transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "border-emerald-400 text-emerald-400"
                    : "border-transparent text-gray-500 hover:text-emerald-400"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && selectedInvestigator && (
          <>
            {loadingActivity ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
            ) : activityData ? (
              <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Evidence Uploads */}
                  <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                        <Upload className="w-5 h-5 text-cyan-400" />
                      </div>
                      <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                        <SelectTrigger className="w-24 h-8 text-xs bg-black/60 border-cyan-500/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-cyan-500/40">
                          <SelectItem value="today" className="text-xs">Today</SelectItem>
                          <SelectItem value="week" className="text-xs">Week</SelectItem>
                          <SelectItem value="month" className="text-xs">Month</SelectItem>
                          <SelectItem value="total" className="text-xs">Total</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-3xl font-mono text-cyan-400 mb-1">
                        {getStatValue(activityData.statistics.evidence)}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">Evidence Files</p>
                    </div>
                  </div>

                  {/* Complaints Filed */}
                  <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-red-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
                        <FileText className="w-5 h-5 text-red-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-mono text-red-400 mb-1">
                        {getStatValue(activityData.statistics.complaints)}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">Complaints Filed</p>
                    </div>
                  </div>

                  {/* Incident Reports */}
                  <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                        <Bot className="w-5 h-5 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-mono text-purple-400 mb-1">
                        {getStatValue(activityData.statistics.incident_reports)}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">AI Reports</p>
                    </div>
                  </div>

                  {/* Watchlist Entries */}
                  <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                        <Eye className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-mono text-emerald-400 mb-1">
                        {getStatValue(activityData.statistics.watchlist)}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">Watchlist Items</p>
                    </div>
                  </div>
                </div>

                {/* Investigator Info & Status */}
                <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-emerald-400 font-mono mb-4">Investigator Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-mono text-sm">Name:</span>
                          <span className="text-gray-300 font-mono">{activityData.investigator.full_name || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-mono text-sm">Email:</span>
                          <span className="text-gray-300 font-mono">{activityData.investigator.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-mono text-sm">Status:</span>
                          {activityData.investigator.is_active ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-mono">
                              <CheckCircle className="w-4 h-4" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400 font-mono">
                              <XCircle className="w-4 h-4" />
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-emerald-400 font-mono mb-4">Activity Status</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500 font-mono text-sm">Last Login:</span>
                          <span className="text-gray-300 font-mono text-sm">
                            {getTimeAgo(activityData.investigator.last_login_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500 font-mono text-sm">Last Activity:</span>
                          <span className="text-gray-300 font-mono text-sm">
                            {getTimeAgo(activityData.investigator.last_activity_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500 font-mono text-sm">Account Created:</span>
                          <span className="text-gray-300 font-mono text-sm">
                            {formatDate(activityData.investigator.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-xl text-emerald-400 font-mono">Activity Timeline</h3>
                  </div>
                  {activityData.activity_timeline.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 font-mono">
                      No activity recorded yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activityData.activity_timeline.map((activity, index) => {
                        const Icon = getActivityIcon(activity.type);
                        const colorClass = getActivityColor(activity.type);
                        return (
                          <div
                            key={index}
                            className={`flex items-start gap-4 p-4 rounded-lg border ${colorClass}`}
                          >
                            <div className="p-2 bg-black/40 rounded-lg border border-current/30">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-mono font-semibold">{activity.action}</p>
                                <span className="text-xs text-gray-500 font-mono">
                                  {getTimeAgo(activity.timestamp)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 font-mono">{activity.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-red-500/20 rounded-lg p-6">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-mono">Failed to load activity data</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Activity Logs Tab */}
        {activeTab === "logs" && selectedInvestigator && (
          <>
            {/* Filters */}
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-emerald-400 font-mono text-sm mb-2 block">Action Type</label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="bg-black/60 border-emerald-500/40 text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-emerald-500/40">
                      <SelectItem value="all" className="font-mono">All Actions</SelectItem>
                      <SelectItem value="upload" className="font-mono">Upload</SelectItem>
                      <SelectItem value="complaint" className="font-mono">Complaint</SelectItem>
                      <SelectItem value="report" className="font-mono">Report</SelectItem>
                      <SelectItem value="watchlist" className="font-mono">Watchlist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-emerald-400 font-mono text-sm mb-2 block">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-emerald-400 font-mono text-sm mb-2 block">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-emerald-400 font-mono text-sm mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={exportLogs}
                    variant="outline"
                    className="w-full bg-cyan-950/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/40"
                    disabled={activityLogs.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>

            {/* Logs Table */}
            {loadingLogs ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-emerald-500/20 bg-black/40">
                        <th className="text-left p-4 text-emerald-400 font-mono text-sm">Timestamp</th>
                        <th className="text-left p-4 text-emerald-400 font-mono text-sm">Type</th>
                        <th className="text-left p-4 text-emerald-400 font-mono text-sm">Action</th>
                        <th className="text-left p-4 text-emerald-400 font-mono text-sm">Details</th>
                        <th className="text-left p-4 text-emerald-400 font-mono text-sm">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-500 font-mono">
                            No activity logs found
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log, index) => {
                          const Icon = getActivityIcon(log.type);
                          const color = getLogColor(log.type);
                          return (
                            <tr key={index} className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition font-mono text-sm">
                              <td className="p-4 text-gray-500">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-gray-600" />
                                  {formatDate(log.timestamp)}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`flex items-center gap-2 px-2 py-1 bg-${color}-950/40 border border-${color}-500/30 rounded text-${color}-400 w-fit`}>
                                  <Icon className="w-3 h-3" />
                                  {log.type.replace("_", " ")}
                                </span>
                              </td>
                              <td className="p-4 text-gray-300">{log.action}</td>
                              <td className="p-4 text-gray-500 max-w-md truncate" title={log.details}>
                                {log.details}
                              </td>
                              <td className="p-4 text-cyan-400 font-mono text-xs">
                                {log.ip_address || "N/A"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Details Tab */}
        {activeTab === "details" && selectedInvestigator && investigatorDetails && (
          <>
            {/* Overview Section */}
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6 mb-6">
              <h3 className="text-xl text-emerald-400 font-mono mb-4">Investigator Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-500 font-mono text-sm">Full Name</label>
                    <p className="text-gray-300 font-mono">{investigatorDetails.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-gray-500 font-mono text-sm">Email</label>
                    <p className="text-gray-300 font-mono">{investigatorDetails.email}</p>
                  </div>
                  <div>
                    <label className="text-gray-500 font-mono text-sm">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {investigatorDetails.is_active ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-mono">
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 font-mono">
                          <XCircle className="w-4 h-4" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-500 font-mono text-sm">Last Login</label>
                    <p className="text-gray-300 font-mono text-sm">{formatDate(investigatorDetails.last_login_at || null)}</p>
                  </div>
                  <div>
                    <label className="text-gray-500 font-mono text-sm">Last Activity</label>
                    <p className="text-gray-300 font-mono text-sm">{formatDate(investigatorDetails.last_activity_at || null)}</p>
                  </div>
                  <div>
                    <label className="text-gray-500 font-mono text-sm">Account Created</label>
                    <p className="text-gray-300 font-mono text-sm">{formatDate(investigatorDetails.created_at || null)}</p>
                  </div>
                  {investigatorDetails.location_city && (
                    <div>
                      <label className="text-gray-500 font-mono text-sm">Location</label>
                      <p className="text-gray-300 font-mono text-sm">
                        {investigatorDetails.location_city}, {investigatorDetails.location_country}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Upload className="w-5 h-5 text-cyan-400" />
                  <span className="text-gray-500 font-mono text-sm">Evidence</span>
                </div>
                <p className="text-3xl font-mono text-cyan-400">{evidence.length}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-red-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-red-400" />
                  <span className="text-gray-500 font-mono text-sm">Complaints</span>
                </div>
                <p className="text-3xl font-mono text-red-400">{complaints.length}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-500 font-mono text-sm">AI Reports</span>
                </div>
                <p className="text-3xl font-mono text-purple-400">{reports.length}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="w-5 h-5 text-emerald-400" />
                  <span className="text-gray-500 font-mono text-sm">Watchlist</span>
                </div>
                <p className="text-3xl font-mono text-emerald-400">{watchlist.length}</p>
              </div>
            </div>

            {/* Detail Sub-Tabs */}
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6 border-b border-emerald-500/20">
                {[
                  { id: "overview" as DetailTabType, label: "Overview", icon: User },
                  { id: "evidence" as DetailTabType, label: "Evidence", icon: Upload },
                  { id: "complaints" as DetailTabType, label: "Complaints", icon: FileText },
                  { id: "reports" as DetailTabType, label: "AI Reports", icon: Bot },
                  { id: "watchlist" as DetailTabType, label: "Watchlist", icon: Eye },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 font-mono text-sm transition-all border-b-2 ${
                        detailTab === tab.id
                          ? "border-emerald-400 text-emerald-400"
                          : "border-transparent text-gray-500 hover:text-emerald-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              {detailTab !== "overview" && (
                <div className="mb-4">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="text"
                      placeholder={`Search ${detailTab}...`}
                      value={detailSearchQuery}
                      onChange={(e) => setDetailSearchQuery(e.target.value)}
                      className="pl-10 bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Tab Content */}
              {loadingDetails ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
              ) : (
                <>
                  {detailTab === "overview" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-black/40 rounded-lg border border-emerald-500/20">
                          <h4 className="text-emerald-400 font-mono mb-2">Recent Evidence</h4>
                          {evidence.slice(0, 5).map((e) => (
                            <div key={e.id} className="text-sm text-gray-400 font-mono py-1">
                              {e.title || e.evidence_id}
                            </div>
                          ))}
                          {evidence.length === 0 && <p className="text-gray-500 font-mono text-sm">No evidence</p>}
                        </div>
                        <div className="p-4 bg-black/40 rounded-lg border border-emerald-500/20">
                          <h4 className="text-emerald-400 font-mono mb-2">Recent Complaints</h4>
                          {complaints.slice(0, 5).map((c) => (
                            <div key={c.id} className="text-sm text-gray-400 font-mono py-1">
                              {c.wallet_address} - {c.status}
                            </div>
                          ))}
                          {complaints.length === 0 && <p className="text-gray-500 font-mono text-sm">No complaints</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {detailTab === "evidence" && (
                    <div className="space-y-3">
                      {filteredDetailData().length === 0 ? (
                        <p className="text-center text-gray-500 font-mono py-8">No evidence found</p>
                      ) : (
                        (filteredDetailData() as Evidence[]).map((e: Evidence) => (
                          <div key={e.id} className="p-4 bg-black/40 rounded-lg border border-cyan-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-cyan-400 font-mono">{e.title || e.evidence_id}</h4>
                                {e.description && <p className="text-gray-400 font-mono text-sm mt-1">{e.description}</p>}
                                <p className="text-gray-500 font-mono text-xs mt-2">{formatDate(e.created_at)}</p>
                              </div>
                              {e.file_path && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-cyan-950/20 border-cyan-500/30 text-cyan-400"
                                  onClick={() => window.open(apiUrl(`evidence/${e.id}/view`), "_blank")}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailTab === "complaints" && (
                    <div className="space-y-3">
                      {filteredDetailData().length === 0 ? (
                        <p className="text-center text-gray-500 font-mono py-8">No complaints found</p>
                      ) : (
                        (filteredDetailData() as Complaint[]).map((c: Complaint) => (
                          <div key={c.id} className="p-4 bg-black/40 rounded-lg border border-red-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-red-400 font-mono">{c.wallet_address}</h4>
                                <p className="text-gray-400 font-mono text-sm mt-1">{c.incident_description.substring(0, 100)}...</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className={`px-2 py-1 rounded text-xs font-mono border ${getStatusColor(c.status)}`}>
                                    {c.status}
                                  </span>
                                  <span className="text-gray-500 font-mono text-xs">{formatDate(c.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailTab === "reports" && (
                    <div className="space-y-3">
                      {filteredDetailData().length === 0 ? (
                        <p className="text-center text-gray-500 font-mono py-8">No reports found</p>
                      ) : (
                        (filteredDetailData() as IncidentReport[]).map((r: IncidentReport) => (
                          <div key={r._id} className="p-4 bg-black/40 rounded-lg border border-purple-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-purple-400 font-mono">{r.wallet_address}</h4>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className={`font-mono ${getRiskColor(r.risk_level)}`}>
                                    Risk: {r.risk_level} ({r.risk_score})
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-mono border ${getStatusColor(r.status)}`}>
                                    {r.status}
                                  </span>
                                  <span className="text-gray-500 font-mono text-xs">{formatDate(r.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailTab === "watchlist" && (
                    <div className="space-y-3">
                      {filteredDetailData().length === 0 ? (
                        <p className="text-center text-gray-500 font-mono py-8">No watchlist entries found</p>
                      ) : (
                        (filteredDetailData() as WatchlistWallet[]).map((w: WatchlistWallet) => (
                          <div key={w.id} className="p-4 bg-black/40 rounded-lg border border-emerald-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-emerald-400 font-mono">{w.wallet_address}</h4>
                                {w.label && <p className="text-gray-400 font-mono text-sm mt-1">{w.label}</p>}
                                <div className="flex items-center gap-4 mt-2">
                                  {w.last_risk_score && (
                                    <span className={`font-mono ${getRiskColor(w.last_risk_level || "")}`}>
                                      Risk: {w.last_risk_level} ({w.last_risk_score})
                                    </span>
                                  )}
                                  <span className="text-gray-500 font-mono text-xs">{formatDate(w.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
