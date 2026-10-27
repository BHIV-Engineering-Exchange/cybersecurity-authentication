import { useEffect } from "react";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { CyberBackground } from "./components/CyberBackground";
import { ScanLines } from "./components/ScanLines";

export default function Admin() {
  // Check authentication on mount and redirect if not authenticated
  useEffect(() => {
    const adminToken = localStorage.getItem("admin_token");
    if (!adminToken) {
      // No token, redirect to landing page
      localStorage.removeItem("current_page");
      window.location.href = "/";
    }
  }, []);

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_email");
    localStorage.removeItem("current_page");
    
    // Redirect to landing page
    window.location.href = "/";
  };

  // Don't render if no token (will redirect)
  const adminToken = localStorage.getItem("admin_token");
  if (!adminToken) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <CyberBackground />
      <ScanLines />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>
      
      <div className="relative z-10">
        <AdminDashboard onLogout={handleLogout} />
      </div>
    </div>
  );
}
