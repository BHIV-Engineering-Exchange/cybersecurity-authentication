import { AdminLoginForm } from "./components/auth/AdminLoginForm";
import { CyberBackground } from "./components/CyberBackground";
import { ScanLines } from "./components/ScanLines";
import { FloatingElements } from "./components/FloatingElements";

export default function AdminLogin() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <CyberBackground />
      <ScanLines />
      <FloatingElements />
      
      {/* Red vignette for admin */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-orange-950/20"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <AdminLoginForm />
      </div>
    </div>
  );
}
