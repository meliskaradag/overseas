import { Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import logo from "./assets/logo.png";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import StudentDashboard from "./pages/StudentDashboard";
import ConsultantDashboard from "./pages/ConsultantDashboard";
import RepresentativeDashboard from "./pages/RepresentativeDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import AllListings from "./pages/AllListings";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginRight: 8 }}>
      Back
    </button>
  );
};

export default function App() {
  const { user, logout } = useAuth();
  const isAuthed = Boolean(user && user.id);
  const location = useLocation();
  const isHome = location.pathname === "/";
  return (
    <div className="app-shell">
      <header className="topbar" style={{ padding: "18px 28px" }}>
        <Link className="brand" to="/" style={{ gap: 10 }}>
          <img src={logo} alt="Overseas Housing" style={{ height: 44, width: "auto" }} />
          <span style={{ fontSize: 20, fontWeight: 700 }}>Overseas Housing</span>
        </Link>
        <div className="header-actions" style={{ fontSize: 15, gap: 16 }}>
          {isAuthed ? (
            <>
              <span className="badge" style={{ fontSize: 13, padding: "6px 12px" }}>
                ● {user.name} - {user.role}
              </span>
              <button className="btn btn-ghost" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">
                Log in
              </Link>
              <Link className="btn btn-primary" to="/register">
                Create account
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="layout">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultant"
            element={
              <ProtectedRoute allowedRoles={["consultant"]}>
                <ConsultantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/representative"
            element={
              <ProtectedRoute allowedRoles={["representative"]}>
                <RepresentativeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/listings" element={<AllListings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
