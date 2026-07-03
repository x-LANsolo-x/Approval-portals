import React, { useEffect, useState } from "react";
import "./App.css";

import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  Navigate
} from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoutes";
import Swal from "sweetalert2";
import SideBar from "./components/Sidebar/SideBar";
import ClubDashboard from "./club/ClubDashboard";
import ClubProfile from "./club/ClubProfile";
import EventPublicationForm from "./club/EventPublicationForm";
import DepartmentDashboard from "./department/DepartmentDashboard";
import ProfessionalSocietyDashboard from "./professional_society/ProfessionalSocietyDashboard";
import CommunityDashboard from "./community/CommunityDashboard";
import DataAnalystDashboard from "./DataAnalyst/Dashboard/DataAnalystDashboard";
import SuperAdminDashboard from "./superadmin/SuperAdminDashboard";
import ProposedCalendar from "./coord/ProposedCalendar";
import ProposeNewEventForm from "./coord/components/ProposeNewEventForm";
import PastEvents from "./coord/components/PastEvents";
import TopBar from "./components/TopBar/TopBar";


function AppContent() {
  const location = useLocation();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [isClub, setIsClub] = useState(false);
  const [isDepartment, setIsDepartment] = useState(false);
  const [isProfessional, setIsProfessional] = useState(false);
  const [isCommunity, setIsCommunity] = useState(false);
  const [isDataAnalyst, setIsDataAnalyst] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [user, setUser] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem("isLoggedIn", "true");
  };

  useEffect(() => {
    localStorage.setItem("isLoggedIn", isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    const getUser = JSON.parse(localStorage?.getItem("user"));
    setUser(getUser);
    setIsClub(getUser?.role_name === "Club");
    setIsDepartment(getUser?.role_name === "Department");
    setIsProfessional(getUser?.role_name === "Professional Society");
    setIsCommunity(getUser?.role_name === "Community");
    setIsDataAnalyst(getUser?.role_name === "Data Analyst" || getUser?.role_name === "Data analyst");
    setIsSuperAdmin(getUser?.role_name === "Super Admin");
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  useEffect(() => {
    if (!navigator.onLine) {
      Swal.fire({
        title: "No Internet Connection",
        text: "You are not connected to the internet.",
        icon: "warning",
        confirmButtonText: "OK",
      });
    }

    window.addEventListener("offline", () => {
      Swal.fire({
        title: "No Internet Connection",
        text: "You are now offline.",
        icon: "warning",
        confirmButtonText: "OK",
      });
    });

    window.addEventListener("online", () => {
      Swal.fire({
        title: "Back Online",
        text: "You are now connected to the internet.",
        icon: "success",
        confirmButtonText: "OK",
      });
    });

    return () => {
      window.removeEventListener("offline", () => { });
      window.removeEventListener("online", () => { });
    };
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // Determine the home dashboard route based on role
  const homeDashboardRoute = () => {
    if (isSuperAdmin) return "/super-admin-dashboard";
    if (isDataAnalyst) return "/data-analyst-dashboard";
    if (isDepartment) return "/department-dashboard";
    if (isProfessional) return "/professional-dashboard";
    if (isCommunity) return "/community-dashboard";
    return "/club-dashboard"; // Default for Club or unknown entity roles
  };

  const isEntityUser = isClub || isDepartment || isProfessional || isCommunity || isDataAnalyst;
  // Super Admin has its own layout (no shared sidebar/topbar)

  // Super Admin full-page bypass
  if (isSuperAdmin && isLoggedIn && location.pathname === '/super-admin-dashboard') {
    return (
      <SuperAdminDashboard
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="app-container">
        {isLoggedIn && location.pathname !== "/login" && location.pathname !== "/" && isEntityUser && (
          <SideBar
            onLogout={handleLogout}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}
        <div className="main-content-wrapper">
          {isLoggedIn && location.pathname !== "/login" && location.pathname !== "/" && isEntityUser && (
            <TopBar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />
          )}

          <Routes>
            <Route
              path="/"
              element={isLoggedIn
                ? <Navigate to={homeDashboardRoute()} />
                : <Home theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/club-dashboard"
              element={
                <ProtectedRoute allowedRoles={["Club"]} user={user}>
                  <ClubDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/department-dashboard"
              element={
                <ProtectedRoute allowedRoles={["Department"]} user={user}>
                  <DepartmentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/professional-dashboard"
              element={
                <ProtectedRoute allowedRoles={["Professional Society"]} user={user}>
                  <ProfessionalSocietyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community-dashboard"
              element={
                <ProtectedRoute allowedRoles={["Community"]} user={user}>
                  <CommunityDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data-analyst-dashboard"
              element={
                <ProtectedRoute allowedRoles={["Data Analyst", "Data analyst"]} user={user}>
                  <DataAnalystDashboard />
                </ProtectedRoute>
              }
            />
            {/* ─── Sidebar-accessible entity routes ─── */}
            <Route
              path="/proposed-calendar"
              element={
                <ProtectedRoute allowedRoles={["Club", "Department", "Professional Society", "Community"]} user={user}>
                  <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                      <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)', fontWeight: 800 }}>Proposed Calendar</h2>
                      <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>View and manage your proposed events calendar.</p>
                    </div>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <ProposedCalendar />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/propose-event"
              element={
                <ProtectedRoute allowedRoles={["Club", "Department", "Professional Society", "Community"]} user={user}>
                  <div style={{ animation: 'fadeIn 0.5s ease-out', padding: '0' }}>
                    <ProposeNewEventForm />
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/past-events"
              element={
                <ProtectedRoute allowedRoles={["Club", "Department", "Professional Society", "Community"]} user={user}>
                  <PastEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/event-publication"
              element={
                <ProtectedRoute allowedRoles={["Club", "Department", "Professional Society", "Community"]} user={user}>
                  <EventPublicationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/club-profile"
              element={
                <ProtectedRoute allowedRoles={["Club", "Department", "Professional Society", "Community"]} user={user}>
                  <ClubProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={["Club", "Department", "Professional Society", "Community", "Data Analyst", "Data analyst"]} user={user}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={["Super Admin"]} user={user}>
                  <SuperAdminDashboard onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<Login onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} />} />
          </Routes>
        </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
