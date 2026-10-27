import { useState, useEffect } from "react";
import { 
  Mail, 
  Send, 
  Bell, 
  MessageSquare, 
  Users, 
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Filter
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
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

interface Message {
  id: number;
  sender_id: number | null;
  recipient_id: number | null;
  message_type: string;
  subject: string;
  content: string;
  is_read: boolean;
  is_broadcast: boolean;
  priority: string;
  created_at: string;
  read_at: string | null;
  sender_email: string | null;
  recipient_email: string | null;
}

type TabType = "send" | "announcements" | "history";

export function InvestigatorCommunicationContent() {
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [selectedInvestigator, setSelectedInvestigator] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("send");
  const [loading, setLoading] = useState(false);
  
  // Send message form
  const [messageSubject, setMessageSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [messagePriority, setMessagePriority] = useState("normal");
  const [messageType, setMessageType] = useState("message");
  
  // Announcement form
  const [announcementSubject, setAnnouncementSubject] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState("normal");
  
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchInvestigators();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchMessageHistory();
    }
  }, [activeTab]);

  const fetchInvestigators = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl("investigators/investigators"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        const investigatorsList = data.investigators || [];
        setInvestigators(investigatorsList);
        if (investigatorsList.length > 0 && !selectedInvestigator) {
          setSelectedInvestigator(investigatorsList[0].id);
        } else if (investigatorsList.length === 0) {
          setErrorMessage("No investigators found. Please create an investigator first.");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(`Failed to load investigators: ${errorData.detail || response.statusText}`);
      }
    } catch (error: any) {
      console.error("Error fetching investigators:", error);
      setErrorMessage(`Error loading investigators: ${error.message || "Network error"}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageHistory = async () => {
    setHistoryLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(apiUrl("messages/history?limit=300"), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setHistory(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(`Failed to load history: ${errorData.detail || response.statusText}`);
      }
    } catch (error: any) {
      setErrorMessage(`Error loading history: ${error?.message || "Network error"}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestigator) {
      setErrorMessage("Please select an investigator");
      return;
    }
    
    if (!messageSubject.trim() || !messageContent.trim()) {
      setErrorMessage("Subject and content are required");
      return;
    }
    
    setSending(true);
    setErrorMessage("");
    setSuccessMessage("");
    
    try {
      // Get token directly to ensure it's available
      const adminToken = localStorage.getItem("admin_token");
      const investigatorToken = localStorage.getItem("investigator_token");
      const accessToken = localStorage.getItem("access_token");
      const token = adminToken || investigatorToken || accessToken;
      
      console.log("🔑 Token check:", {
        adminToken: !!adminToken,
        investigatorToken: !!investigatorToken,
        accessToken: !!accessToken,
        hasToken: !!token
      });
      
      if (!token) {
        console.error("❌ No auth token found! Available localStorage keys:", Object.keys(localStorage));
        setErrorMessage("Authentication required. Please log in again.");
        setSending(false);
        return;
      }
      
      // Build headers explicitly
      const headers: HeadersInit = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      
      console.log("✅ Headers prepared:", { 
        hasAuth: !!headers["Authorization"],
        authValue: headers["Authorization"]?.substring(0, 20) + "..."
      });
      
      const url = apiUrl(`messages/investigators/${selectedInvestigator}/message`);
      console.log("Sending POST to:", url);
      
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message_type: messageType,
          subject: messageSubject,
          content: messageContent,
          priority: messagePriority,
          is_broadcast: false
        }),
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        setSuccessMessage("Message sent successfully!");
        setMessageSubject("");
        setMessageContent("");
        setMessagePriority("normal");
        if (activeTab === "history") {
          fetchMessageHistory();
        }
      } else {
        let errorDetail = "Failed to send message";
        try {
          const data = await response.json();
          errorDetail = data.detail || data.message || errorDetail;
        } catch {
          errorDetail = `Failed to send message (Status: ${response.status})`;
        }
        setErrorMessage(errorDetail);
      }
    } catch (error: any) {
      setErrorMessage("Error sending message: " + (error.message || "Network error"));
    } finally {
      setSending(false);
    }
  };

  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!announcementSubject.trim() || !announcementContent.trim()) {
      setErrorMessage("Subject and content are required");
      return;
    }
    
    setSending(true);
    setErrorMessage("");
    setSuccessMessage("");
    
    try {
      // Get token directly to ensure it's available
      const adminToken = localStorage.getItem("admin_token");
      const investigatorToken = localStorage.getItem("investigator_token");
      const accessToken = localStorage.getItem("access_token");
      const token = adminToken || investigatorToken || accessToken;
      
      console.log("🔑 Broadcast - Token check:", {
        adminToken: !!adminToken,
        investigatorToken: !!investigatorToken,
        accessToken: !!accessToken,
        hasToken: !!token
      });
      
      if (!token) {
        console.error("❌ No auth token found! Available localStorage keys:", Object.keys(localStorage));
        setErrorMessage("Authentication required. Please log in again.");
        setSending(false);
        return;
      }
      
      // Build headers explicitly
      const headers: HeadersInit = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      
      console.log("✅ Broadcast - Headers prepared:", { 
        hasAuth: !!headers["Authorization"],
        authValue: headers["Authorization"]?.substring(0, 20) + "..."
      });
      
      const url = apiUrl(`messages/broadcast`);
      console.log("Broadcast - Sending POST to:", url);
      
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message_type: "announcement",
          subject: announcementSubject,
          content: announcementContent,
          priority: announcementPriority,
          is_broadcast: true
        }),
      });
      
      console.log("Broadcast - Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(`Announcement broadcasted to ${data.recipients} investigator(s)!`);
        setAnnouncementSubject("");
        setAnnouncementContent("");
        setAnnouncementPriority("normal");
        if (activeTab === "history") {
          fetchMessageHistory();
        }
      } else {
        let errorDetail = "Failed to broadcast announcement";
        try {
          const data = await response.json();
          errorDetail = data.detail || data.message || errorDetail;
        } catch {
          errorDetail = `Failed to broadcast announcement (Status: ${response.status})`;
        }
        setErrorMessage(errorDetail);
      }
    } catch (error: any) {
      setErrorMessage("Error broadcasting announcement: " + (error.message || "Network error"));
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "text-red-400 bg-red-950/20 border-red-500/30";
      case "high":
        return "text-orange-400 bg-orange-950/20 border-orange-500/30";
      case "normal":
        return "text-emerald-400 bg-emerald-950/20 border-emerald-500/30";
      case "low":
        return "text-gray-400 bg-gray-950/20 border-gray-500/30";
      default:
        return "text-gray-400 bg-gray-950/20 border-gray-500/30";
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg border border-emerald-500/30">
            <Mail className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl text-emerald-400 font-mono">Investigator Communication Hub</h2>
            <p className="text-sm text-gray-500 font-mono">Send messages and announcements to investigators</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-emerald-500/20">
          {[
            { id: "send" as TabType, label: "Send Message", icon: Send },
            { id: "announcements" as TabType, label: "Broadcast Announcement", icon: Bell },
            { id: "history" as TabType, label: "History", icon: MessageSquare },
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

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-400 font-mono">
              <CheckCircle className="w-5 h-5" />
              {successMessage}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-950/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 font-mono">
              <AlertCircle className="w-5 h-5" />
              {errorMessage}
            </div>
          </div>
        )}

        {/* Send Message Tab */}
        {activeTab === "send" && (
          <form onSubmit={handleSendMessage} className="space-y-6">
            <div>
              <Label className="text-emerald-400 font-mono text-sm mb-2 block">Select Investigator</Label>
              <Select
                value={selectedInvestigator?.toString() || ""}
                onValueChange={(value) => setSelectedInvestigator(parseInt(value))}
              >
                <SelectTrigger className="bg-black/60 border-emerald-500/40 text-gray-100">
                  <SelectValue placeholder="Select an investigator" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-emerald-500/40">
                  {investigators.map((inv) => (
                    <SelectItem
                      key={inv.id}
                      value={inv.id.toString()}
                      className="font-mono text-gray-300 focus:bg-emerald-950/40"
                    >
                      {inv.full_name || inv.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-emerald-400 font-mono text-sm mb-2 block">Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger className="bg-black/60 border-emerald-500/40 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-emerald-500/40">
                  <SelectItem value="message" className="font-mono">Message</SelectItem>
                  <SelectItem value="notification" className="font-mono">Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject" className="text-emerald-400 font-mono text-sm mb-2 block">
                Subject *
              </Label>
              <Input
                id="subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Enter message subject"
                className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
                required
              />
            </div>

            <div>
              <Label htmlFor="content" className="text-emerald-400 font-mono text-sm mb-2 block">
                Content *
              </Label>
              <Textarea
                id="content"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Enter message content"
                className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono min-h-[150px]"
                required
              />
            </div>

            <div>
              <Label className="text-emerald-400 font-mono text-sm mb-2 block">Priority</Label>
              <Select value={messagePriority} onValueChange={setMessagePriority}>
                <SelectTrigger className="bg-black/60 border-emerald-500/40 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-emerald-500/40">
                  <SelectItem value="low" className="font-mono">Low</SelectItem>
                  <SelectItem value="normal" className="font-mono">Normal</SelectItem>
                  <SelectItem value="high" className="font-mono">High</SelectItem>
                  <SelectItem value="urgent" className="font-mono">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        )}

        {/* Broadcast Announcement Tab */}
        {activeTab === "announcements" && (
          <form onSubmit={handleBroadcastAnnouncement} className="space-y-6">
            <div className="p-4 bg-yellow-950/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-mono text-sm font-semibold mb-1">Broadcast Announcement</p>
                  <p className="text-gray-400 font-mono text-xs">
                    This message will be sent to all active investigators. Use this for important system updates, policy changes, or general announcements.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="announcement-subject" className="text-emerald-400 font-mono text-sm mb-2 block">
                Subject *
              </Label>
              <Input
                id="announcement-subject"
                value={announcementSubject}
                onChange={(e) => setAnnouncementSubject(e.target.value)}
                placeholder="Enter announcement subject"
                className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono"
                required
              />
            </div>

            <div>
              <Label htmlFor="announcement-content" className="text-emerald-400 font-mono text-sm mb-2 block">
                Content *
              </Label>
              <Textarea
                id="announcement-content"
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                placeholder="Enter announcement content"
                className="bg-black/60 border-emerald-500/40 text-gray-100 font-mono min-h-[200px]"
                required
              />
            </div>

            <div>
              <Label className="text-emerald-400 font-mono text-sm mb-2 block">Priority</Label>
              <Select value={announcementPriority} onValueChange={setAnnouncementPriority}>
                <SelectTrigger className="bg-black/60 border-emerald-500/40 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-emerald-500/40">
                  <SelectItem value="low" className="font-mono">Low</SelectItem>
                  <SelectItem value="normal" className="font-mono">Normal</SelectItem>
                  <SelectItem value="high" className="font-mono">High</SelectItem>
                  <SelectItem value="urgent" className="font-mono">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-mono"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Broadcast to All Investigators
                </>
              )}
            </Button>
          </form>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 font-mono text-sm">
                Old sent messages and broadcast announcements
              </p>
              <Button
                type="button"
                onClick={fetchMessageHistory}
                disabled={historyLoading}
                className="bg-gray-800 border border-emerald-500/30 text-emerald-400 hover:bg-gray-700 font-mono"
              >
                {historyLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="p-6 bg-black/40 border border-emerald-500/20 rounded-lg text-gray-400 font-mono text-sm">
                No communication history found yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {history.map((msg) => (
                  <div key={msg.id} className="p-4 bg-black/40 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="text-emerald-400 font-mono text-sm">{msg.subject}</h4>
                        <p className="text-gray-500 font-mono text-xs mt-1">
                          To: {msg.recipient_email || `Investigator #${msg.recipient_id}`}
                          {msg.is_broadcast ? " (Broadcast)" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 rounded border text-xs font-mono ${getPriorityColor(msg.priority)}`}>
                          {msg.priority.toUpperCase()}
                        </span>
                        <p className="text-gray-500 font-mono text-xs mt-2">{formatDate(msg.created_at)}</p>
                      </div>
                    </div>
                    <p className="text-gray-200 font-mono text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-1 rounded bg-gray-900/60 border border-gray-700 text-gray-300">
                        {msg.message_type}
                      </span>
                      <span className={`px-2 py-1 rounded border ${msg.is_read ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/20" : "text-yellow-400 border-yellow-500/30 bg-yellow-950/20"}`}>
                        {msg.is_read ? "Read" : "Unread"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
