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
import ProjectsGallery from './pages/ProjectsPage';
import CharityProjectForm from "./pages/CreateProject";
import ProjectDisplayPage from './pages/ProjectDisplayPage';
import UserProfile from './pages/UserProfile';
import NFTGalleryPage from './pages/NFTGalleryPage';

import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';

const navStyles = {
  nav: {
    background: 'linear-gradient(90deg, #ffffff 70%, #f8fafc 100%)',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    flexWrap: 'wrap',
    position: 'sticky',
    top: 0,
    zIndex: 1020,
    height: '70px',
    fontFamily: "'Raleway', sans-serif",
  },
  brandLink: {
    textDecoration: 'none',
    fontSize: '1.8em',
    fontFamily: "'Raleway', sans-serif",
    fontWeight: '700',
    position: 'relative',
    display: 'inline-block',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #1f2937, #3b82f6, #1f2937)',
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
    color: '#374151',
    fontWeight: '500',
    padding: '10px 16px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontSize: '0.95em',
    backgroundColor: 'transparent',
    fontFamily: "'Raleway', sans-serif",
  },
  activeLink: {
    backgroundColor: '#3b82f6',
    color: 'white',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  },
  authButton: {
    background: 'transparent',
    border: '2px solid #3b82f6',
    color: '#3b82f6',
    cursor: 'pointer',
    fontWeight: '600',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '0.95em',
    transition: 'all 0.3s ease',
    marginLeft: '10px',
    fontFamily: "'Raleway', sans-serif",
  },
};

function PageTracker() {
  usePageTracking();
  return null;
}

export default function App() {
  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap');
        `}
      </style>
      <Router>
        <SessionWalletAuthProvider>
          <PageTracker />
          <AppLayout />
        </SessionWalletAuthProvider>
      </Router>
    </>
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
          nGoDonate
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

              <NavLink
                to="/nft"
                style={({ isActive }) =>
                  isActive ? { ...navStyles.link, ...navStyles.activeLink } : navStyles.link
                }
              >
                NFT Gallery
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
        <Route path="/nft" element={<NFTGalleryPage />} />
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
