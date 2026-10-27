import { InvestigatorLoginForm } from "./components/auth/InvestigatorLoginForm";
import { CyberBackground } from "./components/CyberBackground";
import { HexagonGrid } from "./components/HexagonGrid";
import { ScanLines } from "./components/ScanLines";
import { FloatingElements } from "./components/FloatingElements";

export default function InvestigatorLogin() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <CyberBackground />
      <HexagonGrid />
      <ScanLines />
      <FloatingElements />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <InvestigatorLoginForm />
      </div>
    </div>
  );
}
