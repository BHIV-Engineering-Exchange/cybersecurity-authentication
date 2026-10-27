import { Database, Search, Download, FileText, Image, Video, File, Folder, ChevronRight, ChevronDown, Eye, Archive, User, Calendar } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useState, useEffect } from "react";

import { apiUrl, getAuthHeaders } from "@/lib/api";
interface EvidenceFile {
  id: number;
  evidence_id: string;
  title: string;
  description: string;
  hash: string;
  anchor_status: string;
  investigator_id: number | null;
  created_at: string;
  investigator_name?: string;
  investigator_email?: string;
  wallet_address?: string;
  file_path?: string | null;
  file_size?: number | null;
  file_type?: string | null;
}

interface EvidenceFolder {
  walletAddress: string;
  dateCreated: string;
  fileCount: number;
  files: EvidenceFile[];
}

export function EvidenceLibraryContent() {
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [folders, setFolders] = useState<EvidenceFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchEvidence();
  }, []);

  useEffect(() => {
    // Group evidence by wallet address when data changes
    groupEvidenceByWallet();
  }, [evidenceFiles, searchQuery]);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      console.log("🔑 Fetching evidence - Auth headers:", { hasAuth: !!authHeaders["Authorization"] });
      const response = await fetch(apiUrl("evidence/"), { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched evidence data:", data);
        
        if (!data || data.length === 0) {
          console.log("No evidence files found in database");
          setEvidenceFiles([]);
          setLoading(false);
          return;
        }
        
        // Fetch all investigators to map IDs to names
        let investigatorsMap = new Map<number, { name: string; email: string }>();
        try {
          const investigatorsResponse = await fetch(apiUrl("investigators/investigators"), { headers: getAuthHeaders() });
          if (investigatorsResponse.ok) {
            const investigatorsData = await investigatorsResponse.json();
            const investigators = investigatorsData.investigators || [];
            investigators.forEach((inv: any) => {
              investigatorsMap.set(inv.id, {
                name: inv.full_name || inv.email?.split("@")[0] || "Unknown",
                email: inv.email || "Unknown",
              });
            });
          }
        } catch (error) {
          console.error("Error fetching investigators:", error);
        }

        // Fetch investigator details for each evidence file
        const evidenceWithInvestigators = data.map((evidence: EvidenceFile) => {
          if (evidence.investigator_id && investigatorsMap.has(evidence.investigator_id)) {
            const inv = investigatorsMap.get(evidence.investigator_id)!;
            evidence.investigator_name = inv.name;
            evidence.investigator_email = inv.email;
          } else {
            evidence.investigator_name = "Unknown";
            evidence.investigator_email = "Unknown";
          }
          
          // Extract wallet address from description
          const walletMatch = evidence.description?.match(/Wallet:\s*([^\n]+)/i);
          if (walletMatch) {
            evidence.wallet_address = walletMatch[1].trim();
          } else {
            // If no wallet found in description, set to "Unknown Wallet"
            evidence.wallet_address = "Unknown Wallet";
          }
          
          return evidence;
        });
        
        console.log("Processed evidence with investigators:", evidenceWithInvestigators);
        setEvidenceFiles(evidenceWithInvestigators);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch evidence:", response.status, errorText);
        if (response.status === 401) {
          console.error("❌ Authentication failed - token may be missing or expired");
          alert("Authentication required. Please log in again.");
        } else {
          alert(`Failed to fetch evidence files: ${response.status} ${errorText}`);
        }
      }
    } catch (error) {
      console.error("Error fetching evidence:", error);
      alert(`Error fetching evidence files: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const groupEvidenceByWallet = () => {
    if (!evidenceFiles || evidenceFiles.length === 0) {
      setFolders([]);
      return;
    }

    const filteredEvidence = evidenceFiles.filter((evidence) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        evidence.title?.toLowerCase().includes(query) ||
        evidence.evidence_id?.toLowerCase().includes(query) ||
        evidence.wallet_address?.toLowerCase().includes(query) ||
        evidence.investigator_name?.toLowerCase().includes(query) ||
        evidence.investigator_email?.toLowerCase().includes(query)
      );
    });

    // Group by wallet address
    const walletMap = new Map<string, EvidenceFile[]>();
    
    filteredEvidence.forEach((evidence) => {
      const wallet = evidence.wallet_address || "Unknown Wallet";
      if (!walletMap.has(wallet)) {
        walletMap.set(wallet, []);
      }
      walletMap.get(wallet)!.push(evidence);
    });

    // Convert to folder structure
    const foldersList: EvidenceFolder[] = Array.from(walletMap.entries()).map(([wallet, files]) => {
      // Get earliest creation date
      const dates = files
        .map((f) => f.created_at)
        .filter((d) => d)
        .sort();
      const earliestDate = dates[0] ? new Date(dates[0]).toLocaleDateString("en-GB") : "Unknown";

      return {
        walletAddress: wallet,
        dateCreated: earliestDate,
        fileCount: files.length,
        files: files.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA; // Newest first
        }),
      };
    });

    // Sort folders by most recent file
    foldersList.sort((a, b) => {
      const dateA = a.files[0]?.created_at ? new Date(a.files[0].created_at).getTime() : 0;
      const dateB = b.files[0]?.created_at ? new Date(b.files[0].created_at).getTime() : 0;
      return dateB - dateA;
    });

    setFolders(foldersList);
  };

  const toggleFolder = (walletAddress: string) => {
    setExpandedFolders((prev) =>
      prev.includes(walletAddress)
        ? prev.filter((addr) => addr !== walletAddress)
        : [...prev, walletAddress]
    );
  };

  const getFileIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes(".pdf") || lowerTitle.includes("report") || lowerTitle.includes("document")) {
      return FileText;
    }
    if (lowerTitle.includes(".png") || lowerTitle.includes(".jpg") || lowerTitle.includes(".jpeg") || lowerTitle.includes("image") || lowerTitle.includes("photo")) {
      return Image;
    }
    if (lowerTitle.includes(".mp4") || lowerTitle.includes(".avi") || lowerTitle.includes("video") || lowerTitle.includes("footage")) {
      return Video;
    }
    if (lowerTitle.includes(".zip") || lowerTitle.includes(".rar") || lowerTitle.includes("archive")) {
      return Archive;
    }
    return File;
  };

  const getTypeColor = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes(".pdf") || lowerTitle.includes("report") || lowerTitle.includes("document")) {
      return "cyan";
    }
    if (lowerTitle.includes(".png") || lowerTitle.includes(".jpg") || lowerTitle.includes(".jpeg") || lowerTitle.includes("image") || lowerTitle.includes("photo")) {
      return "purple";
    }
    if (lowerTitle.includes(".mp4") || lowerTitle.includes(".avi") || lowerTitle.includes("video") || lowerTitle.includes("footage")) {
      return "orange";
    }
    if (lowerTitle.includes(".zip") || lowerTitle.includes(".rar") || lowerTitle.includes("archive")) {
      return "emerald";
    }
    return "gray";
  };

  const formatDate = (dateString: string | null) => {
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

  const totalFiles = folders.reduce((acc, f) => acc + f.fileCount, 0);
  const totalZips = folders.reduce(
    (acc, f) => acc + f.files.filter((file) => file.title.toLowerCase().includes(".zip") || file.title.toLowerCase().includes("archive")).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Evidence Library
          </h1>
          <p className="text-gray-500 font-mono text-sm">Secure Digital Evidence Repository - Organized by Wallet Address</p>
          <p className="text-gray-600 font-mono text-xs mt-1">View-only access - Evidence submitted by investigators</p>
        </div>
        <Button
          onClick={fetchEvidence}
          className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-mono"
        >
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search by wallet address, file name, evidence ID, or investigator..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-black/60 border-emerald-500/40 text-gray-100 font-mono focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Folders", value: folders.length.toString(), icon: Folder },
          { label: "Total Files", value: totalFiles.toString(), icon: FileText },
          { label: "ZIP Archives", value: totalZips.toString(), icon: Archive },
          { label: "Investigators", value: new Set(evidenceFiles.map((e) => e.investigator_id).filter(Boolean)).size.toString(), icon: User },
        ].map((stat, index) => (
          <div key={index} className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-4 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600/20 border border-emerald-500/30 rounded-lg">
                <stat.icon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl text-gray-100">{stat.value}</div>
                <div className="text-xs text-gray-500 font-mono">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-12 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-gray-500 font-mono text-sm">Loading evidence files...</p>
        </div>
      ) : evidenceFiles.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-3">
          <Folder className="w-12 h-12 text-gray-600" />
          <p className="text-gray-500 font-mono">No evidence files found</p>
          <p className="text-gray-600 text-xs font-mono">
            {searchQuery ? "Try adjusting your search query" : "No evidence has been uploaded yet by investigators"}
          </p>
          <p className="text-gray-700 text-xs font-mono mt-2">
            Evidence files will appear here once investigators upload them through the Evidence Upload section.
          </p>
        </div>
      ) : folders.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-3">
          <Folder className="w-12 h-12 text-gray-600" />
          <p className="text-gray-500 font-mono">No evidence files match your search</p>
          <p className="text-gray-600 text-xs font-mono">Try adjusting your search query</p>
        </div>
      ) : (
        /* Folders List */
        <div className="space-y-3">
          {folders.map((folder) => {
            const isExpanded = expandedFolders.includes(folder.walletAddress);
            return (
              <div
                key={folder.walletAddress}
                className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-lg overflow-hidden hover:border-emerald-500/40 transition-all"
              >
                {/* Folder Header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer group"
                  onClick={() => toggleFolder(folder.walletAddress)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-emerald-400 transition-transform" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                      )}
                      <div className="p-3 bg-emerald-600/20 border border-emerald-500/30 rounded-lg">
                        <Folder className="w-6 h-6 text-emerald-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-100 font-mono mb-1 break-all">{folder.walletAddress}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                        <span className="text-cyan-400">{folder.fileCount} {folder.fileCount === 1 ? "file" : "files"}</span>
                        <span>•</span>
                        <span>Created: {folder.dateCreated}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Files List */}
                {isExpanded && (
                  <div className="border-t border-emerald-500/10 bg-black/20">
                    <div className="p-4 space-y-2">
                      {folder.files.map((file) => {
                        const IconComponent = getFileIcon(file.title);
                        const color = getTypeColor(file.title);
                        return (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-4 bg-black/40 border border-emerald-500/10 rounded-lg hover:border-emerald-500/30 hover:bg-black/60 transition-all group/file"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`p-2 bg-${color}-950/40 border border-${color}-500/30 rounded flex-shrink-0`}>
                                <IconComponent className={`w-4 h-4 text-${color}-400`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-300 font-mono text-sm truncate">{file.title}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500 font-mono mt-1 flex-wrap">
                                  <span className="text-cyan-400">{file.evidence_id}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {file.investigator_name || "Unknown"}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(file.created_at)}
                                  </span>
                                  {file.hash && (
                                    <>
                                      <span>•</span>
                                      <span className="text-gray-600 font-mono" title={file.hash}>
                                        Hash: {file.hash.substring(0, 8)}...
                                      </span>
                                    </>
                                  )}
                                </div>
                                {file.description && (
                                  <p className="text-gray-600 font-mono text-xs mt-2 line-clamp-2">{file.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover/file:opacity-100 transition-opacity flex-shrink-0">
                              {file.file_path ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 font-mono text-xs"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      // View evidence file
                                      try {
                                        const response = await fetch(apiUrl(`evidence/${file.id}/view`), { headers: getAuthHeaders() });
                                        if (response.ok) {
                                          const blob = await response.blob();
                                          const url = window.URL.createObjectURL(blob);
                                          window.open(url, "_blank");
                                        } else {
                                          const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
                                          alert(`Cannot view file: ${errorData.detail || "File not available"}`);
                                        }
                                      } catch (error) {
                                        alert(`Error viewing file: ${error instanceof Error ? error.message : "Unknown error"}`);
                                      }
                                    }}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10 font-mono text-xs"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      // Download evidence file
                                      try {
                                        const response = await fetch(apiUrl(`evidence/${file.id}/download`), { headers: getAuthHeaders() });
                                        if (response.ok) {
                                          const blob = await response.blob();
                                          const url = window.URL.createObjectURL(blob);
                                          const link = document.createElement("a");
                                          link.href = url;
                                          link.download = file.title || `evidence_${file.evidence_id}`;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          window.URL.revokeObjectURL(url);
                                        } else {
                                          const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
                                          alert(`Cannot download file: ${errorData.detail || "File not available"}`);
                                        }
                                      } catch (error) {
                                        alert(`Error downloading file: ${error instanceof Error ? error.message : "Unknown error"}`);
                                      }
                                    }}
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Download
                                  </Button>
                                </>
                              ) : (
                                <span className="text-gray-600 font-mono text-xs px-2 py-1 bg-gray-950/40 border border-gray-700/30 rounded" title="This file was uploaded before file storage was implemented. Only metadata is available.">
                                  File not stored
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
