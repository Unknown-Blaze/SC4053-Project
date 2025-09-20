// src/utils/analytics.js (or similar)
import { analytics, logEvent as firebaseLogEvent } from '../firebase/config';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export const logPageView = (pagePath, pageTitle) => {
  if (analytics) {
    firebaseLogEvent(analytics, 'page_view', {
      page_path: pagePath || window.location.pathname + window.location.search,
      page_title: pageTitle || document.title,
      // You can add more parameters like page_location: window.location.href
    });
    console.log(`Analytics: page_view logged for ${pagePath || window.location.pathname}`);
  }
};

export const logCustomEvent = (eventName, eventParams) => {
  if (analytics) {
    firebaseLogEvent(analytics, eventName, eventParams);
    console.log(`Analytics: custom event '${eventName}' logged with params:`, eventParams);
  }
};

// Hook to log page views on route change
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Log page view with the current path and document title
    logPageView(location.pathname + location.search, document.title);
  }, [location]); // Re-run when location changes
};