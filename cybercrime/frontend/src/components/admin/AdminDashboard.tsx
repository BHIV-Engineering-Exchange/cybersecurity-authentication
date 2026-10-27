import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { DashboardContent } from "./DashboardContent";
import { ManualInvestigatorContent } from "./ManualInvestigatorContent";
import { EscalationsContent } from "./EscalationsContent";
import { EvidenceLibraryContent } from "./EvidenceLibraryContent";
import { AddRemoveInvestigatorsContent } from "./AddRemoveInvestigatorsContent";
import { ResetPasswordsContent } from "./ResetPasswordsContent";
import { Setup2FAContent } from "./Setup2FAContent";
import { InvestigatorsManagementContent } from "./InvestigatorsManagementContent";
import { ComplaintsViewContent } from "./ComplaintsViewContent";
import { InvestigatorActivityContent } from "./InvestigatorActivityContent";
import { InvestigatorStatusContent } from "./InvestigatorStatusContent";
import { InvestigatorCommunicationContent } from "./InvestigatorCommunicationContent";
import { AIFraudDetectionContent } from "./AIFraudDetectionContent";
import { AccessRequestsContent } from "./AccessRequestsContent";
import { TTSPageButton } from "../ui/TTSPageButton";

export type MenuItem = 
  | "dashboard" 
  | "manual-investigator"
  | "investigators-management"
  | "investigator-activity"
  | "investigator-status"
  | "investigator-communication"
  | "escalations" 
  | "evidence-library" 
  | "complaints-view"
  | "fraud-detection"
  | "rl-engine"
  | "access-requests" 
  | "add-remove-investigators" 
  | "reset-passwords" 
  | "setup-2fa";

interface AdminDashboardProps {
  onLogout?: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeItem, setActiveItem] = useState<MenuItem>("dashboard");

  const renderContent = () => {
    switch (activeItem) {
      case "dashboard":
        return <DashboardContent />;
      case "manual-investigator":
        return <ManualInvestigatorContent />;
      case "investigators-management":
        return <InvestigatorsManagementContent />;
      case "investigator-activity":
        return <InvestigatorActivityContent />;
      case "investigator-status":
        return <InvestigatorStatusContent />;
      case "investigator-communication":
        return <InvestigatorCommunicationContent />;
      case "escalations":
        return <EscalationsContent />;
      case "evidence-library":
        return <EvidenceLibraryContent />;
      case "complaints-view":
        return <ComplaintsViewContent />;
      case "fraud-detection":
        return <AIFraudDetectionContent />;
      case "rl-engine":
        return <AIFraudDetectionContent />;
      case "access-requests":
        return <AccessRequestsContent />;
      case "add-remove-investigators":
        return <AddRemoveInvestigatorsContent />;
      case "reset-passwords":
        return <ResetPasswordsContent />;
      case "setup-2fa":
        return <Setup2FAContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar activeItem={activeItem} setActiveItem={setActiveItem} onLogout={onLogout} />
      <main className="flex-1 ml-72 p-6 lg:p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8 border-b border-emerald-500/20 pb-4">
          <div>
            <h1 className="text-2xl font-mono text-emerald-400 uppercase tracking-widest">
              {activeItem.replace(/-/g, ' ')}
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-1">Admin Control Center / {activeItem}</p>
          </div>
          <TTSPageButton />
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}