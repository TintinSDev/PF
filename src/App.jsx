import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import LeadDetail from "./pages/LeadDetail";
import Properties from "./pages/Properties";
import "./App.css";
import { Analytics } from "@vercel/analytics/react";

function AppContent() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [agent, setAgent] = useState(
    JSON.parse(localStorage.getItem("agent") || "null"),
  );
  const location = useLocation();

  const handleLogin = (token, agentData) => {
    setToken(token);
    setAgent(agentData);
    localStorage.setItem("token", token);
    localStorage.setItem("agent", JSON.stringify(agentData));
  };

  const handleLogout = () => {
    setToken(null);
    setAgent(null);
    localStorage.removeItem("token");
    localStorage.removeItem("agent");
  };

  return (
    <div className="app">
      {token && (
        <nav className="navbar">
          <div className="nav-container">
            <h1 className="logo">PropertyFlow CRM</h1>
            <div className="nav-links">
              <Link
                to="/"
                className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
              >
                Leads
              </Link>
              <Link
                to="/properties"
                className={`nav-link ${location.pathname === "/properties" ? "active" : ""}`}
              >
                Properties
              </Link>
            </div>
            <div className="nav-right">
              <span className="agent-name">Welcome, {agent?.name}</span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}

      <Routes>
        {token ? (
          <>
            <Route
              path="/"
              element={<Dashboard token={token} agent={agent} />}
            />
            <Route path="/leads/:id" element={<LeadDetail token={token} />} />
            <Route
              path="/properties"
              element={<Properties token={token} agent={agent} />}
            />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route
              path="/login"
              element={<LoginPage onLogin={handleLogin} />}
            />
            <Route
              path="/register"
              element={<RegisterPage onLogin={handleLogin} />}
            />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        )}
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
      <Analytics />
    </Router>
  );
}

export default App;
