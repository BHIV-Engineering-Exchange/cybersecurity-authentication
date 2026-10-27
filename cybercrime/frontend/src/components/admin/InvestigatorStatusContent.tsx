import { useState, useEffect } from "react";
import { 
  Activity, 
  Clock, 
  MapPin, 
  Shield, 
  KeyRound,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  Calendar,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "../ui/button";
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
}

interface StatusData {
  investigator: {
    id: number;
    email: string;
    full_name: string | null;
    is_active: boolean;
    created_at: string | null;
  };
  status: {
    is_online: boolean;
    last_login_at: string | null;
    last_activity_at: string | null;
    session_duration_seconds: number | null;
    session_duration_formatted: string | null;
  };
  health_metrics: {
    account_status: string;
    password_age_days: number | null;
    password_status: string;
    two_factor_enabled: boolean;
    activity_score: number;
  };
  login_frequency: {
    last_7_days: number;
    last_30_days: number;
  };
  location: {
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    ip_address: string | null;
    last_updated: string | null;
  };
}

export function InvestigatorStatusContent() {
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [selectedInvestigator, setSelectedInvestigator] = useState<number | null>(null);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchInvestigators();
  }, []);

  useEffect(() => {
    if (selectedInvestigator) {
      fetchStatus();
    }
  }, [selectedInvestigator]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (autoRefresh && selectedInvestigator) {
      interval = setInterval(() => {
        fetchStatus();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedInvestigator]);

  const fetchInvestigators = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl("investigators/investigators"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setInvestigators(data.investigators || []);
        if (data.investigators && data.investigators.length > 0 && !selectedInvestigator) {
          setSelectedInvestigator(data.investigators[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching investigators:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    if (!selectedInvestigator) return;
    
    setLoadingStatus(true);
    try {
      const response = await fetch(apiUrl(`investigators/${selectedInvestigator}/status`), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setStatusData(data);
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    } finally {
      setLoadingStatus(false);
    }
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

  const getPasswordStatusColor = (status: string) => {
    switch (status) {
      case "expired":
        return "text-red-400 bg-red-950/20 border-red-500/30";
      case "warning":
        return "text-yellow-400 bg-yellow-950/20 border-yellow-500/30";
      case "good":
        return "text-emerald-400 bg-emerald-950/20 border-emerald-500/30";
      default:
        return "text-gray-400 bg-gray-950/20 border-gray-500/30";
    }
  };

  const getActivityScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    if (score >= 25) return "text-orange-400";
    return "text-red-400";
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
              <h2 className="text-2xl text-emerald-400 font-mono">Investigator Status & Health</h2>
              <p className="text-sm text-gray-500 font-mono">Monitor investigator status and health metrics</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant="outline"
              className={`${autoRefresh ? "bg-emerald-950/40 border-emerald-500/50" : "bg-gray-950/20 border-gray-500/30"} text-emerald-400 hover:bg-emerald-950/40`}
            >
              {autoRefresh ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
            </Button>
            <Button
              onClick={fetchStatus}
              variant="outline"
              className="bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
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
                  {inv.full_name || inv.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedInvestigator && statusData && (
        <>
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Online Status */}
            <div className={`bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border rounded-lg p-6 ${
              statusData.status.is_online 
                ? "border-emerald-500/30" 
                : "border-gray-500/30"
            }`}>
              <div className="flex items-center justify-between mb-4">
                {statusData.status.is_online ? (
                  <Wifi className="w-6 h-6 text-emerald-400" />
                ) : (
                  <WifiOff className="w-6 h-6 text-gray-400" />
                )}
                <span className={`px-2 py-1 rounded text-xs font-mono border ${
                  statusData.status.is_online
                    ? "text-emerald-400 bg-emerald-950/20 border-emerald-500/30"
                    : "text-gray-400 bg-gray-950/20 border-gray-500/30"
                }`}>
                  {statusData.status.is_online ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              <p className="text-2xl font-mono mb-1">
                {statusData.status.is_online ? "Active" : "Inactive"}
              </p>
              <p className="text-xs text-gray-500 font-mono">
                Last activity: {getTimeAgo(statusData.status.last_activity_at)}
              </p>
            </div>

            {/* Session Duration */}
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="text-2xl font-mono text-cyan-400 mb-1">
                {statusData.status.session_duration_formatted || "N/A"}
              </p>
              <p className="text-xs text-gray-500 font-mono">Current Session</p>
              <p className="text-xs text-gray-600 font-mono mt-1">
                Last login: {getTimeAgo(statusData.status.last_login_at)}
              </p>
            </div>

            {/* Activity Score */}
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-purple-500/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <p className={`text-2xl font-mono mb-1 ${getActivityScoreColor(statusData.health_metrics.activity_score)}`}>
                {statusData.health_metrics.activity_score}%
              </p>
              <p className="text-xs text-gray-500 font-mono">Activity Score</p>
            </div>

            {/* Account Status */}
            <div className={`bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border rounded-lg p-6 ${
              statusData.health_metrics.account_status === "active"
                ? "border-emerald-500/30"
                : "border-red-500/30"
            }`}>
              <div className="flex items-center gap-3 mb-4">
                {statusData.health_metrics.account_status === "active" ? (
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
              </div>
              <p className={`text-2xl font-mono mb-1 ${
                statusData.health_metrics.account_status === "active" ? "text-emerald-400" : "text-red-400"
              }`}>
                {statusData.health_metrics.account_status.toUpperCase()}
              </p>
              <p className="text-xs text-gray-500 font-mono">Account Status</p>
            </div>
          </div>

          {/* Health Metrics */}
          <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
            <h3 className="text-xl text-emerald-400 font-mono mb-4">Health Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Password Status */}
              <div className="p-4 bg-black/40 rounded-lg border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-emerald-400 font-mono">Password Status</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-mono text-sm">Age:</span>
                    <span className="text-gray-300 font-mono text-sm">
                      {statusData.health_metrics.password_age_days !== null
                        ? `${statusData.health_metrics.password_age_days} days`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-mono text-sm">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-mono border ${getPasswordStatusColor(statusData.health_metrics.password_status)}`}>
                      {statusData.health_metrics.password_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2FA Status */}
              <div className="p-4 bg-black/40 rounded-lg border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-emerald-400 font-mono">Two-Factor Authentication</h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-mono text-sm">Status:</span>
                  {statusData.health_metrics.two_factor_enabled ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-mono text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Enabled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-400 font-mono text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Disabled
                    </span>
                  )}
                </div>
              </div>

              {/* Login Frequency */}
              <div className="p-4 bg-black/40 rounded-lg border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-emerald-400 font-mono">Login Frequency</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-mono text-sm">Last 7 days:</span>
                    <span className="text-gray-300 font-mono text-sm">
                      {statusData.login_frequency.last_7_days} login{statusData.login_frequency.last_7_days !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-mono text-sm">Last 30 days:</span>
                    <span className="text-gray-300 font-mono text-sm">
                      {statusData.login_frequency.last_30_days} login{statusData.login_frequency.last_30_days !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="p-4 bg-black/40 rounded-lg border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-emerald-400 font-mono">Last Known Location</h4>
                </div>
                <div className="space-y-2">
                  {statusData.location.city ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-mono text-sm">Location:</span>
                        <span className="text-gray-300 font-mono text-sm">
                          {statusData.location.city}, {statusData.location.country}
                        </span>
                      </div>
                      {statusData.location.ip_address && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-mono text-sm">IP Address:</span>
                          <span className="text-gray-300 font-mono text-xs">
                            {statusData.location.ip_address}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-mono text-sm">Last Updated:</span>
                        <span className="text-gray-300 font-mono text-xs">
                          {getTimeAgo(statusData.location.last_updated)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500 font-mono text-sm">No location data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedInvestigator && !statusData && !loadingStatus && (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-mono">Failed to load status data</p>
          </div>
        </div>
      )}

      {loadingStatus && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      )}
    </div>
  );
}
