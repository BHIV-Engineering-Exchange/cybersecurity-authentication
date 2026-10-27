/**
 * Incident Report Display Component
 * Shows comprehensive analysis results from the API
 */

import { useState, useRef, useEffect } from "react";
import { Download, AlertTriangle, TrendingUp, Users, ArrowRightLeft, Clock, CheckCircle2, FileText, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";
import { TextToSpeechIconButton } from "../ui/TextToSpeechButton";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { apiUrl, getAuthHeaders } from "@/lib/api";
interface IncidentReportData {
  wallet: string;
  risk_score: number;
  risk_level: string;
  detected_patterns: string[];
  summary: {
    total_in: number;
    total_out: number;
    tx_count: number;
    unique_senders: number;
    unique_receivers: number;
    pattern_type: string;
  };
  graph_data: Array<{
    from: string;
    to: string;
    amount: number;
  }>;
  transactions?: Array<{
    id: number;
    from_address: string;
    to_address: string;
    amount: number;
    direction: string;
    timestamp?: string | null;
    type?: string | null;
    suspicious?: boolean;
  }>;
  timeline: Array<{
    time: string;
    amount: number;
    timestamp: string;
  }>;
  report_id?: string | null;
  notes?: Array<{
    note: string;
    author: string;
    timestamp: string;
  }>;
  system_conclusion: string;
}

interface IncidentReportDisplayProps {
  reportData: IncidentReportData;
}

export function IncidentReportDisplay({ reportData }: IncidentReportDisplayProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const transactions = reportData.transactions ?? [];
  const [notes, setNotes] = useState(reportData.notes ?? []);
  const [newNote, setNewNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const getRiskColor = (level: string) => {
    const levelUpper = level.toUpperCase();
    if (levelUpper.includes("VERY HIGH") || levelUpper.includes("CRITICAL")) {
      return "text-red-400 border-red-500/50 bg-red-950/20";
    } else if (levelUpper.includes("HIGH")) {
      return "text-orange-400 border-orange-500/50 bg-orange-950/20";
    } else if (levelUpper.includes("MEDIUM")) {
      return "text-yellow-400 border-yellow-500/50 bg-yellow-950/20";
    } else {
      return "text-green-400 border-green-500/50 bg-green-950/20";
    }
  };

  const getRiskBadgeColor = (level: string) => {
    const levelUpper = level.toUpperCase();
    if (levelUpper.includes("VERY HIGH") || levelUpper.includes("CRITICAL")) {
      return "bg-red-500/20 text-red-400 border-red-500/40";
    } else if (levelUpper.includes("HIGH")) {
      return "bg-orange-500/20 text-orange-400 border-orange-500/40";
    } else if (levelUpper.includes("MEDIUM")) {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
    } else {
      return "bg-green-500/20 text-green-400 border-green-500/40";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const element = document.getElementById("incident-report-content");
      if (!element) {
        throw new Error("Report content not found");
      }

      const canvas = await html2canvas(element, {
        backgroundColor: "#000000",
        scale: 2,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`incident-report-${reportData.wallet}-${Date.now()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const netFlow = reportData.summary.total_in - reportData.summary.total_out;

  return (
    <div id="incident-report-content" className="space-y-6">
      {/* Case Overview Card */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-mono text-emerald-400">Case Overview</h2>
          <div className="flex items-center gap-2">
            <TextToSpeechIconButton
              text={`Case Overview. Wallet address: ${reportData.wallet}. Risk level: ${reportData.risk_level}. Risk score: ${(reportData.risk_score * 100).toFixed(0)} percent. Primary pattern: ${reportData.summary.pattern_type}.`}
              className="mr-2"
            />
            <Button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 hover:text-emerald-300 font-mono text-sm"
            >
              {isGeneratingPDF ? (
                <>
                  <span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mr-2"></span>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Investigation Report
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-mono">Wallet Address</p>
            <p className="text-sm text-gray-300 font-mono break-all">{reportData.wallet}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-mono">Primary Pattern</p>
            <p className="text-sm text-emerald-400 font-mono">{reportData.summary.pattern_type}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-mono">Risk Level</p>
            <span className={`inline-block px-3 py-1 rounded border font-mono text-sm ${getRiskBadgeColor(reportData.risk_level)}`}>
              {reportData.risk_level}
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-mono">Risk Score</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    reportData.risk_score >= 0.8
                      ? "bg-red-500"
                      : reportData.risk_score >= 0.6
                      ? "bg-orange-500"
                      : reportData.risk_score >= 0.4
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${reportData.risk_score * 100}%` }}
                ></div>
              </div>
              <span className={`text-sm font-mono font-bold ${getRiskColor(reportData.risk_level).split(" ")[0]}`}>
                {(reportData.risk_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Summary */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-emerald-400 font-mono flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Transaction Summary
          </h3>
          <TextToSpeechIconButton
            text={`Transaction Summary. Total incoming: ${formatCurrency(reportData.summary.total_in)}. Total outgoing: ${formatCurrency(reportData.summary.total_out)}. Net flow: ${formatCurrency(netFlow)}. Transaction count: ${reportData.summary.tx_count}. Unique senders: ${reportData.summary.unique_senders}. Unique receivers: ${reportData.summary.unique_receivers}.`}
            className="ml-2"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-mono mb-1">Total Incoming</p>
            <p className="text-lg text-emerald-400 font-mono font-bold">{formatCurrency(reportData.summary.total_in)}</p>
          </div>
          <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-mono mb-1">Total Outgoing</p>
            <p className="text-lg text-red-400 font-mono font-bold">{formatCurrency(reportData.summary.total_out)}</p>
          </div>
          <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-mono mb-1">Net Flow</p>
            <p className={`text-lg font-mono font-bold ${netFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {netFlow >= 0 ? "+" : ""}{formatCurrency(netFlow)}
            </p>
          </div>
          <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-mono mb-1">Transaction Count</p>
            <p className="text-lg text-gray-300 font-mono font-bold">{reportData.summary.tx_count}</p>
          </div>
          <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-mono mb-1">Unique Senders</p>
            <p className="text-lg text-gray-300 font-mono font-bold flex items-center gap-1">
              <Users className="w-4 h-4" />
              {reportData.summary.unique_senders}
            </p>
          </div>
          <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-mono mb-1">Unique Receivers</p>
            <p className="text-lg text-gray-300 font-mono font-bold flex items-center gap-1">
              <Users className="w-4 h-4" />
              {reportData.summary.unique_receivers}
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Details Table */}
      {transactions.length > 0 && (
        <TransactionDetailsTable transactions={transactions} />
      )}

      {/* Money Flow Graph */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <h3 className="text-lg text-emerald-400 font-mono mb-4 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5" />
          Money Flow Visualization
        </h3>
        <MoneyFlowGraph graphData={reportData.graph_data} wallet={reportData.wallet} />
      </div>

      {/* Timeline Chart */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <h3 className="text-lg text-emerald-400 font-mono mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Transaction Timeline
        </h3>
        <TimelineChart timeline={reportData.timeline} />
      </div>

      {/* Detected Suspicious Patterns */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <h3 className="text-lg text-emerald-400 font-mono mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Detected Suspicious Patterns
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reportData.detected_patterns.map((pattern, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-red-950/20 border border-red-500/30 rounded-lg"
            >
              <CheckCircle2 className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400 font-mono font-semibold">{pattern}</p>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  {getPatternDescription(pattern)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Conclusion */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-emerald-400 font-mono flex items-center gap-2">
            <FileText className="w-5 h-5" />
            System Conclusion
          </h3>
          <TextToSpeechIconButton
            text={`System Conclusion. ${reportData.system_conclusion}`}
            className="ml-2"
          />
        </div>
        <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-4">
          <p className="text-gray-300 font-mono leading-relaxed">{reportData.system_conclusion}</p>
        </div>
      </div>

      {/* Investigator Notes */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
        <h3 className="text-lg text-emerald-400 font-mono mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Investigator Notes
        </h3>

        {notes.length === 0 ? (
          <p className="text-xs text-gray-500 font-mono mb-4">
            No notes added yet. Use the form below to record investigation comments.
          </p>
        ) : (
          <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
            {notes.map((n, idx) => (
              <div
                key={`${n.timestamp}-${idx}`}
                className="p-3 bg-black/40 border border-emerald-500/20 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-emerald-400 font-mono">
                    {n.author || "Investigator"}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(n.timestamp).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-gray-200 font-mono whitespace-pre-wrap">
                  {n.note}
                </p>
              </div>
            ))}
          </div>
        )}

        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newNote.trim() || !reportData.report_id) return;
            try {
              setIsSavingNote(true);
              const token = localStorage.getItem("investigator_token") || localStorage.getItem("access_token");
              const headers: HeadersInit = {};
              if (token) {
                headers["Authorization"] = `Bearer ${token}`;
              }
              const res = await fetch(
                apiUrl(`incidents/reports/${reportData.report_id}/notes?note=${encodeURIComponent(
                  newNote.trim()
                )}`),
                {
                  method: "POST",
                  headers,
                }
              );
              if (res.ok) {
                const data = await res.json();
                if (data.note) {
                  setNotes((prev) => [...prev, data.note]);
                  setNewNote("");
                } else {
                  console.error("Failed to add note: Invalid response", data);
                  alert("Failed to add note. Please try again.");
                }
              } else {
                const errorData = await res.json().catch(() => ({}));
                console.error("Failed to add note:", res.status, errorData);
                if (res.status === 401) {
                  alert("Authentication required. Please log in again.");
                } else {
                  alert(`Failed to add note: ${errorData.detail || "Unknown error"}`);
                }
              }
            } catch (err) {
              console.error("Error adding note", err);
              alert("An error occurred while adding the note. Please try again.");
            } finally {
              setIsSavingNote(false);
            }
          }}
        >
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            placeholder={
              reportData.report_id
                ? "Add an internal investigation note..."
                : "Notes are available only after this report has been saved."
            }
            disabled={!reportData.report_id}
            className="w-full bg-black/60 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-emerald-100 placeholder:text-gray-600 font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-mono">
              Notes are stored with this report and included in downloaded PDFs.
            </span>
            <Button
              type="submit"
              disabled={!reportData.report_id || !newNote.trim() || isSavingNote}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingNote ? "Saving..." : "Add Note"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getPatternDescription(pattern: string): string {
  const descriptions: Record<string, string> = {
    "Rapid Consolidation": "Multiple transactions consolidated quickly, indicating potential fraud",
    "Money Laundering (Layering)": "Funds moved through multiple intermediate wallets to obscure origin",
    "Multiple Hop Transfers": "Transactions passed through several wallets before final destination",
    "Circular Movement": "Funds moved in circular pattern to create fake transaction history",
    "Structuring Detected": "Multiple transactions just under reporting thresholds",
    "High Transaction Frequency": "Unusually high number of transactions in short time period",
  };
  return descriptions[pattern] || "Suspicious transaction pattern detected";
}

function MoneyFlowGraph({ graphData, wallet }: { graphData: Array<{ from: string; to: string; amount: number }>, wallet: string }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.2;

  // Group nodes by type
  const nodes = new Map<string, { id: string; type: "wallet" | "source" | "destination"; amount: number; x: number; y: number }>();
  
  // Calculate node positions
  graphData.forEach((edge) => {
    // Add from node
    if (!nodes.has(edge.from)) {
      let type: "wallet" | "source" | "destination" = "source";
      if (edge.from === wallet) type = "wallet";
      else if (edge.from.includes("VICTIM") || edge.from.includes("INVESTOR")) type = "source";
      else if (edge.from.includes("MULE") || edge.from.includes("EXIT") || edge.from.includes("CLEAN")) type = "destination";
      
      nodes.set(edge.from, { id: edge.from, type, amount: 0, x: 0, y: 0 });
    }
    
    // Add to node
    if (!nodes.has(edge.to)) {
      let type: "wallet" | "source" | "destination" = "destination";
      if (edge.to === wallet) type = "wallet";
      else if (edge.to.includes("VICTIM") || edge.to.includes("INVESTOR")) type = "source";
      else if (edge.to.includes("MULE") || edge.to.includes("EXIT") || edge.to.includes("CLEAN")) type = "destination";
      
      nodes.set(edge.to, { id: edge.to, type, amount: 0, x: 0, y: 0 });
    }
    
    // Update amounts
    if (edge.from !== wallet) {
      nodes.get(edge.from)!.amount += edge.amount;
    }
    if (edge.to !== wallet) {
      nodes.get(edge.to)!.amount += edge.amount;
    }
  });

  const nodeList = Array.from(nodes.values());
  const getNodeEdges = (nodeId: string) =>
    graphData.filter((edge) => edge.from === nodeId || edge.to === nodeId);
  const maxAmount = Math.max(...nodeList.map(n => n.amount), 1);

  // Calculate positions for nodes
  const baseWidth = 800;
  const baseHeight = 400;
  nodeList.forEach((node, idx) => {
    node.x = 100 + (idx % 4) * 200;
    node.y = 100 + Math.floor(idx / 4) * 150;
  });

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((prev) => Math.max(MIN_ZOOM, Math.min(prev + delta, MAX_ZOOM)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPanning(false);
    };

    if (isPanning) {
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [isPanning]);

  // Add wheel event listener with non-passive option to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((prev) => Math.max(MIN_ZOOM, Math.min(prev + delta, MAX_ZOOM)));
    };

    container.addEventListener("wheel", handleWheelEvent, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheelEvent);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-96 bg-black/40 border border-emerald-500/20 rounded-lg p-4 overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Search & Zoom Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-4 pointer-events-none">
        <div className="flex-1 max-w-xs pointer-events-auto">
          <input
            type="text"
            placeholder="Search wallet in graph..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded bg-black/70 border border-emerald-500/40 text-xs text-emerald-100 placeholder:text-gray-600 font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
          />
        </div>
        <div className="flex flex-col gap-2 pointer-events-auto">
          <Button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="w-10 h-10 p-0 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-950/80 hover:border-emerald-500/60 text-emerald-400"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="w-10 h-10 p-0 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-950/80 hover:border-emerald-500/60 text-emerald-400"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleReset}
            className="w-10 h-10 p-0 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-950/80 hover:border-emerald-500/60 text-emerald-400"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 left-4 z-10 px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded text-xs text-emerald-400 font-mono">
        {Math.round(zoom * 100)}%
      </div>

      {/* Pan Hint */}
      {zoom > 1 && (
        <div className="absolute bottom-4 left-28 z-10 px-3 py-1 bg-gray-900/80 border border-gray-600/40 rounded text-xs text-gray-400 font-mono">
          Click & drag to pan
        </div>
      )}

      {/* Node Detail Tooltip Panel */}
      {(hoveredNodeId || selectedNodeId) && (
        <div className="absolute top-16 left-4 z-10 px-4 py-3 bg-black/85 border border-emerald-500/40 rounded-lg text-xs text-gray-200 font-mono max-w-sm">
          {(() => {
            const activeId = hoveredNodeId || selectedNodeId!;
            const node = nodeList.find((n) => n.id === activeId);
            if (!node) return null;
            const edges = getNodeEdges(activeId);
            const totalAmount = edges.reduce((sum, e) => sum + e.amount, 0);
            const uniquePeers = new Set<string>();
            edges.forEach((e) => {
              if (e.from !== activeId) uniquePeers.add(e.from);
              if (e.to !== activeId) uniquePeers.add(e.to);
            });
            return (
              <div className="space-y-1">
                <div className="text-emerald-400 text-[11px] uppercase tracking-wide">
                  Node Details
                </div>
                <div className="text-[11px] break-all">
                  <span className="text-gray-500">Wallet:</span>{" "}
                  <span className="text-gray-200">{activeId}</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-1">
                  <div>
                    <span className="text-gray-500">Role:</span>{" "}
                    <span className="text-gray-200">
                      {node.type === "wallet"
                        ? "Central Wallet"
                        : node.type === "source"
                        ? "Source / Investor"
                        : "Destination / Exit"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Connected Nodes:</span>{" "}
                    <span className="text-gray-200">{uniquePeers.size}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Transactions:</span>{" "}
                    <span className="text-gray-200">{edges.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Flow:</span>{" "}
                    <span className="text-gray-200">
                      {(totalAmount / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div 
        className="w-full h-full overflow-auto"
        style={{ cursor: isPanning ? "grabbing" : zoom > 1 ? "grab" : "default" }}
      >
        <svg 
          ref={svgRef}
          width={baseWidth} 
          height={baseHeight} 
          viewBox={`0 0 ${baseWidth} ${baseHeight}`}
          className="min-w-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            transition: isPanning ? "none" : "transform 0.1s ease-out",
          }}
        >
        {/* Draw edges */}
        {graphData.map((edge, idx) => {
          const fromNode = nodeList.find(n => n.id === edge.from);
          const toNode = nodeList.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const fromX = fromNode.x;
          const fromY = fromNode.y;
          const toX = toNode.x;
          const toY = toNode.y;

          const strokeWidth = Math.max(1, (edge.amount / maxAmount) * 5);
          const color = fromNode.type === "source" ? "#ef4444" : toNode.type === "destination" ? "#10b981" : "#3b82f6";

          const isConnectedToSelected =
            selectedNodeId &&
            (edge.from === selectedNodeId || edge.to === selectedNodeId);

          const baseOpacity = 0.6;
          const strokeOpacity =
            selectedNodeId && !isConnectedToSelected ? 0.15 : baseOpacity;

          return (
            <line
              key={`edge-${idx}`}
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {/* Arrow marker */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Draw nodes */}
        {nodeList.map((node) => {
          const x = node.x;
          const y = node.y;
          
          const getNodeColor = () => {
            if (node.type === "wallet") return "#10b981"; // green
            if (node.type === "source") return "#ef4444"; // red
            return "#3b82f6"; // blue
          };

          const radius = node.type === "wallet" ? 25 : 15;

          const isHovered = hoveredNodeId === node.id;
          const isSelected = selectedNodeId === node.id;
          const matchesSearch =
            searchQuery.length > 0 &&
            node.id.toLowerCase().includes(searchQuery.toLowerCase());

          const isDimmedBySelection =
            selectedNodeId &&
            selectedNodeId !== node.id &&
            !graphData.some(
              (e) =>
                (e.from === selectedNodeId && e.to === node.id) ||
                (e.to === selectedNodeId && e.from === node.id)
            );

          const nodeOpacity = isDimmedBySelection
            ? 0.25
            : isHovered || isSelected || matchesSearch
            ? 1
            : 0.85;

          const strokeWidth = isSelected ? 3 : matchesSearch ? 2 : 1;
          const strokeColor = isSelected
            ? "#facc15"
            : matchesSearch
            ? "#22c55e"
            : "#0f172a";

          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() =>
                setHoveredNodeId((current) => (current === node.id ? null : current))
              }
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodeId((current) =>
                  current === node.id ? null : node.id
                );
              }}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={getNodeColor()}
                opacity={nodeOpacity}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
              />
              <text
                x={x}
                y={y + radius + 15}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="10"
                fontFamily="monospace"
                className="pointer-events-none"
              >
                {node.id.length > 12 ? node.id.substring(0, 12) + "..." : node.id}
              </text>
              {node.amount > 0 && (
                <text
                  x={x}
                  y={y - radius - 5}
                  textAnchor="middle"
                  fill="#e5e7eb"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  ${(node.amount / 1000).toFixed(0)}k
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 flex gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-400">Source (Risky)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-400">Central Wallet</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-400">Destination</span>
        </div>
      </div>
    </div>
  );
}

function TransactionDetailsTable({
  transactions,
}: {
  transactions: Array<{
    id: number;
    from_address: string;
    to_address: string;
    amount: number;
    direction: string;
    timestamp?: string | null;
    type?: string | null;
    suspicious?: boolean;
  }>;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<"amount" | "timestamp">("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [directionFilter, setDirectionFilter] = useState<"all" | "incoming" | "outgoing" | "related">("all");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const pageSize = 5;

  const filtered = transactions.filter((t) => {
    const amt = t.amount;
    const minOk = minAmount ? amt >= Number(minAmount) : true;
    const maxOk = maxAmount ? amt <= Number(maxAmount) : true;

    const directionOk =
      directionFilter === "all" ? true : t.direction === directionFilter;

    const typeOk = typeFilter
      ? (t.type || "").toLowerCase().includes(typeFilter.toLowerCase())
      : true;

    let dateOk = true;
    if (t.timestamp) {
      const d = new Date(t.timestamp);
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (d < from) dateOk = false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        // add one day to include full end date
        to.setDate(to.getDate() + 1);
        if (d >= to) dateOk = false;
      }
    }

    return minOk && maxOk && directionOk && typeOk && dateOk;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "amount") {
      const diff = a.amount - b.amount;
      return sortDir === "asc" ? diff : -diff;
    }
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    const diff = ta - tb;
    return sortDir === "asc" ? diff : -diff;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const changeSort = (key: "amount" | "timestamp") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const exportCsv = () => {
    const header = ["id", "from", "to", "amount", "direction", "timestamp", "type", "suspicious"];
    const rows = transactions.map((t) => [
      t.id,
      `"${t.from_address}"`,
      `"${t.to_address}"`,
      t.amount,
      t.direction,
      t.timestamp ?? "",
      t.type ?? "",
      t.suspicious ? "yes" : "no",
    ]);
    const csv =
      header.join(",") +
      "\n" +
      rows.map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `transactions-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg text-emerald-400 font-mono">Transaction Details</h3>
          <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded font-mono">
            {transactions.length} records
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-mono">Filters:</span>
          <input
            type="number"
            placeholder="Min amount"
            value={minAmount}
            onChange={(e) => {
              setMinAmount(e.target.value);
              setCurrentPage(1);
            }}
            className="w-24 px-2 py-1 rounded bg-black/60 border border-emerald-500/30 text-[10px] text-emerald-100 placeholder:text-gray-600 font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
          />
          <input
            type="number"
            placeholder="Max amount"
            value={maxAmount}
            onChange={(e) => {
              setMaxAmount(e.target.value);
              setCurrentPage(1);
            }}
            className="w-24 px-2 py-1 rounded bg-black/60 border border-emerald-500/30 text-[10px] text-emerald-100 placeholder:text-gray-600 font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
          />
          <select
            value={directionFilter}
            onChange={(e) => {
              setDirectionFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded bg-black/60 border border-emerald-500/30 text-[10px] text-emerald-100 font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
          >
            <option value="all">All</option>
            <option value="incoming">Incoming</option>
            <option value="outgoing">Outgoing</option>
            <option value="related">Related</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded bg-black/60 border border-emerald-500/30 text-[10px] text-emerald-100 font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded bg-black/60 border border-emerald-500/30 text-[10px] text-emerald-100 font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
          />
          <input
            type="text"
            placeholder="Type..."
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-24 px-2 py-1 rounded bg-black/60 border border-emerald-500/30 text-[10px] text-emerald-100 placeholder:text-gray-600 font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
          />
          <Button
            onClick={exportCsv}
            className="h-8 px-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/70 font-mono text-xs"
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-emerald-500/30 text-emerald-400">
              <th className="py-2 px-3 text-left">#</th>
              <th className="py-2 px-3 text-left">From</th>
              <th className="py-2 px-3 text-left">To</th>
              <th
                className="py-2 px-3 text-left cursor-pointer select-none"
                onClick={() => changeSort("amount")}
              >
                Amount {sortKey === "amount" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                className="py-2 px-3 text-left cursor-pointer select-none"
                onClick={() => changeSort("timestamp")}
              >
                Time {sortKey === "timestamp" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th className="py-2 px-3 text-left">Direction</th>
              <th className="py-2 px-3 text-left">Suspicious</th>
            </tr>
          </thead>
          <tbody>
            {current.map((t) => (
              <tr
                key={t.id}
                className={`border-b border-emerald-500/10 ${t.suspicious ? "bg-red-950/20" : ""}`}
              >
                <td className="py-2 px-3 text-gray-400">{t.id}</td>
                <td className="py-2 px-3 text-gray-300 break-all max-w-[140px]">
                  {t.from_address}
                </td>
                <td className="py-2 px-3 text-gray-300 break-all max-w-[140px]">
                  {t.to_address}
                </td>
                <td className="py-2 px-3 text-gray-200">
                  {(t.amount / 1000).toFixed(1)}k
                </td>
                <td className="py-2 px-3 text-gray-400">
                  {t.timestamp ? new Date(t.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      t.direction === "incoming"
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/40"
                        : t.direction === "outgoing"
                        ? "bg-red-950/40 text-red-400 border border-red-500/40"
                        : "bg-sky-950/40 text-sky-400 border border-sky-500/40"
                    }`}
                  >
                    {t.direction.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 px-3">
                  {t.suspicious ? (
                    <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-500/60 text-[10px]">
                      FLAGGED
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500">Normal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-400 font-mono">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }).map((_, idx) => {
            const page = idx + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded border text-xs ${
                  page === currentPage
                    ? "border-emerald-500/70 bg-emerald-950/60 text-emerald-300"
                    : "border-emerald-500/20 bg-black/40 text-gray-400 hover:border-emerald-500/50 hover:text-emerald-200"
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TimelineChart({ timeline }: { timeline: Array<{ time: string; amount: number; timestamp: string }> }) {
  const maxAmount = Math.max(...timeline.map(t => t.amount), 1);
  const chartHeight = 200;
  const chartWidth = Math.max(800, timeline.length * 40);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg width={chartWidth} height={chartHeight + 40} className="min-w-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            y1={chartHeight * ratio}
            x2={chartWidth}
            y2={chartHeight * ratio}
            stroke="#374151"
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />
        ))}

        {/* Bars */}
        {timeline.map((entry, idx) => {
          const x = (idx / timeline.length) * chartWidth;
          const barHeight = (entry.amount / maxAmount) * chartHeight;
          const color = entry.amount > maxAmount * 0.7 ? "#ef4444" : entry.amount > maxAmount * 0.4 ? "#f59e0b" : "#10b981";

          return (
            <g key={idx}>
              <rect
                x={x - 15}
                y={chartHeight - barHeight}
                width={30}
                height={barHeight}
                fill={color}
                opacity={0.8}
                className="hover:opacity-100 transition-opacity"
              />
              <text
                x={x}
                y={chartHeight + 15}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="9"
                fontFamily="monospace"
              >
                {entry.time}
              </text>
              {barHeight > 20 && (
                <text
                  x={x}
                  y={chartHeight - barHeight - 5}
                  textAnchor="middle"
                  fill="#e5e7eb"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  ${(entry.amount / 1000).toFixed(0)}k
                </text>
              )}
            </g>
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <text
            key={ratio}
            x={-5}
            y={chartHeight * (1 - ratio) + 4}
            textAnchor="end"
            fill="#6b7280"
            fontSize="9"
            fontFamily="monospace"
          >
            ${((maxAmount * ratio) / 1000).toFixed(0)}k
          </text>
        ))}
      </svg>
    </div>
  );
}
