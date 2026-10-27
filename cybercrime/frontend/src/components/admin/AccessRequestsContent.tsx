import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { CheckCircle, XCircle, Clock, Search, UserPlus, Mail, FileText, Calendar } from "lucide-react";

import { apiUrl, getAuthHeaders } from "@/lib/api";
interface AccessRequest {
  id: number;
  full_name: string;
  email: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: number | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function AccessRequestsContent() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [confirmInitialPassword, setConfirmInitialPassword] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter]);

  const fetchRequests = async () => {
    setLoadError(null);
    try {
      const response = await fetch(apiUrl("access-requests/requests"), { headers: getAuthHeaders() });
      const data = await response.json().catch(() => ([]));
      if (response.ok) {
        setRequests(data);
      } else {
        const message =
          data?.error?.message ||
          data?.detail ||
          data?.message ||
          `Failed to load access requests (${response.status})`;
        setLoadError(message);
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      setLoadError("Network error while loading access requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.full_name.toLowerCase().includes(term) ||
          req.email.toLowerCase().includes(term) ||
          (req.reason && req.reason.toLowerCase().includes(term))
      );
    }

    setFilteredRequests(filtered);
  };

  const handleReview = async (requestId: number, status: "approved" | "rejected") => {
    if (status === "approved") {
      const password = initialPassword.trim();
      const confirm = confirmInitialPassword.trim();
      if (password || confirm) {
        if (!password || !confirm) {
          alert("Fill both initial password fields or leave both empty.");
          return;
        }
        if (password.length < 8) {
          alert("Initial password must be at least 8 characters.");
          return;
        }
        if (password !== confirm) {
          alert("Initial password and confirm password do not match.");
          return;
        }
      }
    }

    setReviewing(true);
    try {
      const body: any = { status };
      if (status === "rejected" && rejectionReason) {
        body.rejection_reason = rejectionReason;
      }
      if (status === "approved") {
        body.initial_password = initialPassword.trim();
      }

      const response = await fetch(
        apiUrl(`access-requests/requests/${requestId}/review`),
        {
          method: "PATCH",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const responseData = await response.json().catch(() => ({}));
      if (response.ok) {
        await fetchRequests();
        setSelectedRequest(null);
        setRejectionReason("");
        setInitialPassword("");
        setConfirmInitialPassword("");
        alert(status === "approved" ? "Request approved successfully!" : "Request rejected.");
      } else {
        const errorMessage =
          responseData?.error?.message ||
          responseData?.detail ||
          responseData?.message ||
          "Failed to review request";
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setReviewing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500/20 border-emerald-500/40 text-emerald-400";
      case "rejected":
        return "bg-red-500/20 border-red-500/40 text-red-400";
      default:
        return "bg-yellow-500/20 border-yellow-500/40 text-yellow-400";
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Investigator Access Requests
          </h1>
          <p className="text-gray-500 font-mono text-sm">Review and approve investigator access requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-4">
          <div className="text-2xl font-mono text-emerald-400 mb-1">{requests.length}</div>
          <div className="text-xs text-gray-500 font-mono">Total Requests</div>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-yellow-500/20 rounded-lg p-4">
          <div className="text-2xl font-mono text-yellow-400 mb-1">{pendingCount}</div>
          <div className="text-xs text-gray-500 font-mono">Pending</div>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-4">
          <div className="text-2xl font-mono text-emerald-400 mb-1">{approvedCount}</div>
          <div className="text-xs text-gray-500 font-mono">Approved</div>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-red-500/20 rounded-lg p-4">
          <div className="text-2xl font-mono text-red-400 mb-1">{rejectedCount}</div>
          <div className="text-xs text-gray-500 font-mono">Rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search by name, email, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setStatusFilter("all")}
            variant={statusFilter === "all" ? "default" : "outline"}
            className="font-mono"
          >
            All
          </Button>
          <Button
            onClick={() => setStatusFilter("pending")}
            variant={statusFilter === "pending" ? "default" : "outline"}
            className="font-mono"
          >
            Pending
          </Button>
          <Button
            onClick={() => setStatusFilter("approved")}
            variant={statusFilter === "approved" ? "default" : "outline"}
            className="font-mono"
          >
            Approved
          </Button>
          <Button
            onClick={() => setStatusFilter("rejected")}
            variant={statusFilter === "rejected" ? "default" : "outline"}
            className="font-mono"
          >
            Rejected
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 font-mono text-xs">
            {loadError}
          </p>
        </div>
      )}

      {/* Requests Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 font-mono">Loading requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-gray-500 font-mono">No requests found</div>
      ) : (
        <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-emerald-500/10 border-b border-emerald-500/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-mono text-emerald-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-mono text-emerald-400 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-mono text-emerald-400 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-mono text-emerald-400 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-mono text-emerald-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-mono text-emerald-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-emerald-500/5 transition">
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="text-xs font-mono capitalize">{request.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-mono text-sm">{request.full_name}</td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-sm">{request.email}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs max-w-xs truncate">
                      {request.reason || "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setSelectedRequest(request)}
                            size="sm"
                            className="bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30 font-mono text-xs"
                          >
                            Review
                          </Button>
                        </div>
                      )}
                      {request.status !== "pending" && (
                        <span className="text-gray-600 font-mono text-xs">
                          {request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-emerald-500/30 rounded-lg shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-mono text-emerald-400 mb-4">Review Access Request</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-gray-400 font-mono text-xs mb-1 block">Name</label>
                <div className="text-gray-200 font-mono">{selectedRequest.full_name}</div>
              </div>
              <div>
                <label className="text-gray-400 font-mono text-xs mb-1 block">Email</label>
                <div className="text-gray-200 font-mono">{selectedRequest.email}</div>
              </div>
              <div>
                <label className="text-gray-400 font-mono text-xs mb-1 block">Reason</label>
                <div className="text-gray-300 font-mono text-sm bg-black/40 p-3 rounded border border-emerald-500/20">
                  {selectedRequest.reason || "No reason provided"}
                </div>
              </div>
              <div>
                <label className="text-gray-400 font-mono text-xs mb-1 block">Requested On</label>
                <div className="text-gray-200 font-mono text-sm">
                  {new Date(selectedRequest.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-gray-400 font-mono text-xs mb-2 block">
                Rejection Reason (if rejecting)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-black/60 border border-emerald-500/40 text-gray-100 font-mono rounded-lg p-3 min-h-[100px] resize-none"
                placeholder="Optional: Provide a reason for rejection..."
              />
            </div>

            <div className="mb-6">
              <label className="text-gray-400 font-mono text-xs mb-2 block">
                Initial Password (optional override)
              </label>
              <Input
                type="password"
                value={initialPassword}
                onChange={(e) => setInitialPassword(e.target.value)}
                className="bg-black/60 border border-emerald-500/40 text-gray-100 font-mono mb-2"
                placeholder="Minimum 8 characters"
              />
              <Input
                type="password"
                value={confirmInitialPassword}
                onChange={(e) => setConfirmInitialPassword(e.target.value)}
                className="bg-black/60 border border-emerald-500/40 text-gray-100 font-mono"
                placeholder="Confirm initial password"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setSelectedRequest(null);
                  setRejectionReason("");
                  setInitialPassword("");
                  setConfirmInitialPassword("");
                }}
                className="flex-1 bg-gray-800/60 border border-gray-700/40 text-gray-300 hover:bg-gray-700/60 font-mono"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleReview(selectedRequest.id, "rejected")}
                disabled={reviewing}
                className="flex-1 bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30 font-mono"
              >
                {reviewing ? "Processing..." : "Reject"}
              </Button>
              <Button
                onClick={() => handleReview(selectedRequest.id, "approved")}
                disabled={reviewing}
                className="flex-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30 font-mono"
              >
                {reviewing ? "Processing..." : "Approve"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
