import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./App";
import AdminPage from "./Pages/AdminPage";
import InvestigatorPage from "./Pages/InvestigatorPage";
import PublicPage from "./Pages/PublicPage";
import PublicStatus from "./components/PublicStatus";

import "./index.css";
import "./styles/Button.css"; 

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/investigator" element={<InvestigatorPage />} />
          <Route path="/public" element={<PublicPage />} />
          <Route path="/status" element={<PublicStatus />} />
        </Routes>
    </BrowserRouter>
  </React.StrictMode>
);