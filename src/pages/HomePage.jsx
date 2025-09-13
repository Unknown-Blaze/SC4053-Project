// src/pages/HomePage.jsx
import React from 'react';
import LandingPage from '../components/LandingPage'; // This is your main landing page content
// Removed Link as it's no longer used here

const homePageStyles = {
  pageContainer: {
    // This can be minimal or set a global background if App.jsx doesn't
    // backgroundColor: '#FFFFFF', // Assuming default page background is white
  },
  // Admin footer styles and related state are removed
};

const HomePage = () => {
  return (
    <div style={homePageStyles.pageContainer}>
      <LandingPage />
    </div>
  );
};

export default HomePage;