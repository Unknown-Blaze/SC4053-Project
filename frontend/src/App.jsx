// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink, NavLink, Navigate } from 'react-router-dom';

import { useAuth } from './contexts/AuthContext';
import HomePage from './pages/HomePage'; // This will be our landing page
// AdminLoginPage might not be needed if admin logic is integrated elsewhere or secured differently
// import AdminLoginPage from './pages/AdminLoginPage';
import ProjectDonationPage from './pages/ProjectDonationPage';
import UserLoginPage from './pages/UserLoginPage';
import SignupPage from './pages/SignUpPage';
import { usePageTracking } from './utils/analytics';
import MintNFTPage from './pages/MintNFT';
import CharityProjectForm from "./pages/CreateProject";
import ProjectDisplayPage from './pages/ProjectDisplayPage';
import UserProfile from './pages/UserProfile'; // This is the component for /userprofile

// Import the route protection components
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'; // Adjust path if needed

const navStyles = {
  nav: {
    background: 'linear-gradient(90deg, #ffffff 70%, #e7f6fa 100%)', // subtle blue tint at the end
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e0e0e0',
    boxShadow: '0 4px 16px rgba(0,124,138,0.05)', // a bit more shadow, with a blue tint
    flexWrap: 'wrap',
    position: 'sticky',
    top: 0,
    zIndex: 1020,
    height: '70px',
    fontFamily: "'Open Sans', sans-serif",
  },
  brandLink: {
    textDecoration: 'none',
    color: '#0A2E36',
    // fontWeight: 'bold',
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
    backgroundColor: 'transparent', // Default transparent
    fontFamily: 'Montserrat',
  },
  activeLink: {
    backgroundColor: '#007C8A', // Blue background when active
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
  authButtonHover: {
    backgroundColor: '#007C8A',
    color: 'white',
  }
};

function PageTracker() {
  usePageTracking();
  return null;
}

export default function App() {
  return (
    <Router>
      <PageTracker />
      <AppLayout />
    </Router>
  );
}

function AppLayout() {
  const { currentUser, logout, currentUserProfile, loadingAuth } = useAuth(); // Added loadingAuth

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation after logout is handled by ProtectedRoute redirecting from protected pages
    } catch (error) {
      console.error("Failed to log out", error);
      alert("Logout failed. Please try again.");
    }
  };

  const profileName = currentUserProfile?.displayName
    ? `${currentUserProfile.displayName}'s Profile`
    : "My Profile";

  // Display a loading indicator while auth state is being determined
  // This prevents flickering or incorrect redirects on initial load
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
        <RouterLink to="/" style={navStyles.brandLink}>
          nGoDONATE
        </RouterLink>

        <div style={navStyles.navLinksContainer}>
          {currentUser ? (
            <>
              <NavLink
                to="/userprofile" // <<<< CHANGED: Link to /userprofile
                style={({ isActive }) =>
                  isActive
                    ? { ...navStyles.link, ...navStyles.activeLink }
                    : navStyles.link
                }
              >
                {profileName}
              </NavLink>
              <NavLink
                to="/nftPage" // Assuming this is a public gallery page
                style={({ isActive }) =>
                  isActive
                    ? { ...navStyles.link, ...navStyles.activeLink }
                    : navStyles.link
                }
              >
                NFT Gallery
              </NavLink>
              {/* Optional: Link to create project if user is logged in */}
              {/* <NavLink
                to="/createproject"
                style={({ isActive }) =>
                  isActive
                    ? { ...navStyles.link, ...navStyles.activeLink }
                    : navStyles.link
                }
              >
                Create Project
              </NavLink> */}
              <button
                onClick={handleLogout}
                style={navStyles.authButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = navStyles.authButtonHover.backgroundColor;
                  e.currentTarget.style.color = navStyles.authButtonHover.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = navStyles.authButton.color;
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                style={({ isActive }) =>
                  isActive
                    ? { ...navStyles.link, ...navStyles.activeLink }
                    : navStyles.link
                }
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                style={({ isActive }) =>
                  isActive
                    ? { ...navStyles.link, ...navStyles.activeLink }
                    : navStyles.link
                }
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      </nav>

      <Routes>
        {/* Default Route Logic */}
        <Route
          path="/"
          element={
            currentUser ? <Navigate to="/userprofile" replace /> : <Navigate to="/landing" replace />
          }
        />

        {/* Public Routes */}
        <Route path="/landing" element={<HomePage />} />
        <Route path="/nftPage" element={<MintNFTPage />} /> {/* Assuming public */}
        <Route path="/projects/:projectId" element={<ProjectDisplayPage />} /> {/* Publicly viewable project details */}

        {/* Routes only for Unauthenticated Users (e.g., login, signup) */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<UserLoginPage />} />
        </Route>

        {/* Protected Routes (Require Authentication) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/userprofile" element={<UserProfile />} />
          <Route path="/createproject" element={<CharityProjectForm />} />
          <Route path="/donate/project/:projectId" element={<ProjectDonationPage />} />
          {/* Add other authenticated user routes here */}
        </Route>

        {/* Admin Route - Ensure currentUser check and ADMIN_UID comparison is robust */}
        {/* This specific admin route structure might need more thought for larger admin sections */}
        {/* You might want a dedicated /admin/login for admin users or a role-based system */}
        {/* <Route path="/admin/login" element={<AdminLoginPage />} /> */}


        {/* Catch-all for undefined routes - redirects to the smart default route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}