// src/App.jsx
import React from 'react';
import {BrowserRouter as Router,Routes,Route,Link as RouterLink,NavLink,Navigate,useNavigate} from 'react-router-dom';

import { useAuth } from './contexts/AuthContext';
import { SessionWalletAuthProvider } from './contexts/SessionWalletAuthContext';
import HomePage from './pages/HomePage';
import ProjectDonationPage from './pages/ProjectDonationPage';
import UserLoginPage from './pages/UserLoginPage';
import WalletLoginPage from './pages/WalletLoginPage';
import SignupPage from './pages/SignUpPage';
import UnifiedAuthPage from './pages/UnifiedAuthPage';
import AdminDebugPage from './pages/AdminDebugPage';
import { usePageTracking } from './utils/analytics';
import MintNFTPage from './pages/MintNFT';
import ProjectsGallery from './pages/ProjectsPage';
import CharityProjectForm from "./pages/CreateProject";
import ProjectDisplayPage from './pages/ProjectDisplayPage';
import UserProfile from './pages/UserProfile';

import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';

const navStyles = {
  nav: {
    background: 'linear-gradient(90deg, #ffffff 70%, #e7f6fa 100%)',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e0e0e0',
    boxShadow: '0 4px 16px rgba(0,124,138,0.05)',
    flexWrap: 'wrap',
    position: 'sticky',
    top: 0,
    zIndex: 1020,
    height: '70px',
    fontFamily: "'Open Sans', sans-serif",
  },
  brandLink: {
    textDecoration: 'none',
    fontSize: '1.8em',
    fontFamily: 'Montserrat',
    position: 'relative',
    display: 'inline-block',
    transition: 'color 0.3s',
    background: 'linear-gradient(90deg, #0A2E36, #007C8A, #0A2E36)',
    backgroundSize: '200% 100%',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navLinksContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '25px',
  },
  link: {
    textDecoration: 'none',
    color: '#333333',
    fontWeight: '500',
    padding: '8px 15px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease, color 0.2s ease',
    fontSize: '1em',
    backgroundColor: 'transparent',
    fontFamily: 'Montserrat',
  },
  activeLink: {
    backgroundColor: '#007C8A',
    color: 'white',
  },
  authButton: {
    background: 'transparent',
    border: '1px solid #007C8A',
    color: '#007C8A',
    cursor: 'pointer',
    fontWeight: '500',
    padding: '8px 18px',
    borderRadius: '4px',
    fontSize: '0.95em',
    transition: 'background-color 0.2s ease, color 0.2s ease',
    marginLeft: '10px',
  },
};

function PageTracker() {
  usePageTracking();
  return null;
}

export default function App() {
  return (
    <Router>
      <SessionWalletAuthProvider>
        <PageTracker />
        <AppLayout />
      </SessionWalletAuthProvider>
    </Router>
  );
}

function AppLayout() {
  const { currentUser, logout, currentUserProfile, loadingAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/auth", { replace: true }); 
    } catch (error) {
      console.error("Failed to log out", error);
      alert("Logout failed. Please try again.");
    }
  };

  const profileName = currentUserProfile?.displayName
    ? `${currentUserProfile.displayName}'s Profile`
    : "My Profile";

  if (loadingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading Application...
      </div>
    );
  }

  return (
    <>
      <nav style={navStyles.nav}>
        <RouterLink to="/landing" style={navStyles.brandLink}>
          nGoDONATE
        </RouterLink>

        <div style={navStyles.navLinksContainer}>
          {currentUser ? (
            <>
              <NavLink
                to="/userprofile"
                style={({ isActive }) =>
                  isActive ? { ...navStyles.link, ...navStyles.activeLink } : navStyles.link
                }
              >
                {profileName}
              </NavLink>

              <NavLink
                to="/projects"
                style={({ isActive }) =>
                  isActive ? { ...navStyles.link, ...navStyles.activeLink } : navStyles.link
                }
              >
                Projects Gallery
              </NavLink>

              {currentUserProfile?.userType === "nonprofit" && (
                <NavLink
                  to="/createproject"
                  style={({ isActive }) =>
                    isActive ? { ...navStyles.link, ...navStyles.activeLink } : navStyles.link
                  }
                >
                  Create Project
                </NavLink>
              )}

              <button
                onClick={handleLogout}
                style={navStyles.authButton}
                className="logout-btn"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/auth"
                style={({ isActive }) =>
                  isActive ? { ...navStyles.link, ...navStyles.activeLink } : navStyles.link
                }
              >
                Sign In / Sign Up
              </NavLink>
            </>
          )}
        </div>
      </nav>

      <Routes>
        {/* Default Route */}
        <Route
          path="/"
          element={
            currentUser ? <Navigate to="/userprofile" replace /> : <Navigate to="/landing" replace />
          }
        />

        {/* Public Routes */}
        <Route path="/landing" element={<HomePage />} />
        <Route path="/nft" element={<MintNFTPage />} />
        <Route path="/projects" element={<ProjectsGallery />} />
        <Route path="/projects/:projectId" element={<ProjectDisplayPage />} />
        <Route path="/admin-debug" element={<AdminDebugPage />} />

        {/* Routes only for Unauthenticated Users */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/auth" element={<UnifiedAuthPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<UserLoginPage />} />
          <Route path="/wallet-login" element={<WalletLoginPage />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/userprofile" element={<UserProfile />} />
          <Route path="/createproject" element={<CharityProjectForm />} />
          <Route path="/donate/project/:projectId" element={<ProjectDonationPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
