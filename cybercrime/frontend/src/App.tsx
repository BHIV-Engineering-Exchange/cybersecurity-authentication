import { useState, useEffect } from "react";
import { LandingPage } from "./components/LandingPage";
import { AdminLogin } from "./components/auth/AdminLogin";
import { InvestigatorLogin } from "./components/auth/InvestigatorLogin";
import { ResetPassword } from "./components/auth/ResetPassword";
import Admin from "./admin";
import { InvestigatorDashboard } from "./components/investigator/InvestigatorDashboard";

type Page =
  | "landing"
  | "admin-login"
  | "investigator-login"
  | "admin-dashboard"
  | "investigator-dashboard"
  | "reset-password";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("landing");

  // Initial route / auth detection (reset-password, admin/investigator tokens, persisted page)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasToken = urlParams.get("token");
    const hasEmail = urlParams.get("email");

    const isResetPasswordRoute =
      window.location.pathname.includes("reset-password") ||
      (window.location.href.includes("reset-password") && hasToken && hasEmail);

    if (isResetPasswordRoute) {
      setCurrentPage("reset-password");
      return;
    }

    // LOCAL DEV BYPASS: Automatically log in as superadmin for faster development
    const DEV_BYPASS = false; 
    if (DEV_BYPASS && !localStorage.getItem("admin_token") && !localStorage.getItem("investigator_token")) {
      localStorage.setItem("admin_token", "dev-token");
      localStorage.setItem("admin_email", "admin@cybercrime.gov");
      setCurrentPage("admin-dashboard");
      return;
    }

    const adminToken = localStorage.getItem("admin_token");
    const investigatorToken = localStorage.getItem("investigator_token");
    const savedPage = (localStorage.getItem("current_page") as Page | null) || null;

    // Priority: Check tokens first, then saved page
    if (adminToken) {
      // Admin is logged in - always go to admin dashboard on refresh
      setCurrentPage("admin-dashboard");
      localStorage.setItem("current_page", "admin-dashboard");
    } else if (investigatorToken) {
      // Investigator is logged in
      setCurrentPage("investigator-dashboard");
      localStorage.setItem("current_page", "investigator-dashboard");
    } else if (savedPage && (savedPage === "admin-login" || savedPage === "investigator-login")) {
      // Keep login pages if that's where they were
      setCurrentPage(savedPage);
    } else {
      // No auth tokens - go to landing page
      setCurrentPage("landing");
      localStorage.removeItem("current_page");
    }
  }, []);

  // Persist current page so refresh keeps user on the same screen (when authorized)
  useEffect(() => {
    if (currentPage === "reset-password") return;
    localStorage.setItem("current_page", currentPage);
  }, [currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case "landing":
        return <LandingPage setCurrentPage={setCurrentPage} />;
      case "admin-login":
        return <AdminLogin setCurrentPage={setCurrentPage} />;
      case "investigator-login":
        return <InvestigatorLogin setCurrentPage={setCurrentPage} />;
      case "reset-password":
        return <ResetPassword setCurrentPage={(page: string) => setCurrentPage(page as Page)} />;
      case "admin-dashboard":
        return <Admin />;
      case "investigator-dashboard":
        return <InvestigatorDashboard setCurrentPage={setCurrentPage} />;
      default:
        return <LandingPage setCurrentPage={setCurrentPage} />;
    }
  };

  return renderPage();
}

export default App;
