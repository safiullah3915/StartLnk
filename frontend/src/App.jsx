import React, { useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/login/Login';
import { Signup } from './components/Signup/Signup';
import EmailVerification from './components/EmailVerification/EmailVerification';
import { LandingPage } from './pages/LandingPage/LandingPage';
import { Marketplace } from './pages/Marketplace/Marketplace';
import { Collaboration } from './pages/Collaboration/Collaboration';
import StartupDetails from './pages/StartupDetails/StartupDetails';
import CreateStartupProject from './pages/CreateStartup/CreateStartupProject';
import ApplyJob from './pages/ApplyJob/ApplyJob';
import ComingSoon from './components/comingsoon/Comingsoon';
import AccountSettings from './pages/AccountSettings/AccountSettings';
import AccountSettingsII from './pages/AccountSettings/AccountSettingsII';
import Message from './pages/message/Message';
import MessageDark from './pages/message/MessageDark';
import Dashboard from './pages/Dashboard/Dashboard';
import SearchStartups from './pages/Search/SearchStartups';
import PositionManagement from './pages/PositionManagement/PositionManagement';
import PositionApplications from './pages/PositionApplications/PositionApplications';
import StartupsWithApplications from './pages/StartupsWithApplications/StartupsWithApplications';
import StartupApplications from './pages/StartupApplications/StartupApplications';
import InvestorDashboard from './pages/InvestorDashboard/InvestorDashboard';
import PitchIdea from './pages/PitchIdea/PitchIdea';
import OnboardingPreferences from './pages/OnboardingPreferences/OnboardingPreferences';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute/RoleBasedRoute';
import CompleteProfile from './pages/CompleteProfile/CompleteProfile';
import People from './pages/People/People';

// Component to scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Use 'instant' for immediate scroll, or 'smooth' for animated scroll
    });
  }, [pathname]);

  return null;
}

// Custom hook: pull-to-refresh via raw touch events
function usePullToRefresh(onRefresh) {
  const startY = useRef(0);
  const isPulling = useRef(false);
  const THRESHOLD = 80; // px pull distance required to trigger

  useEffect(() => {
    const onTouchStart = (e) => {
      // Only trigger when at the very top of the page
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const onTouchMove = (e) => {
      if (!isPulling.current) return;
      const deltaY = e.touches[0].clientY - startY.current;
      // If pulling DOWN and past threshold, mark as triggered
      if (deltaY > THRESHOLD) {
        isPulling.current = 'triggered';
      }
    };

    const onTouchEnd = () => {
      if (isPulling.current === 'triggered') {
        onRefresh();
      }
      isPulling.current = false;
      startY.current = 0;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh]);
}

// Main App component with routing
function AppRoutes() {
  const { isAuthenticated, user, loading, getAuthStatus } = useAuth();
  const location = useLocation();
  const [transitionStage, setTransitionStage] = React.useState('fade-in');
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Debug: Log current auth status
  React.useEffect(() => {
    const status = getAuthStatus();
    console.log('🔐 Current Auth Status:', status);
  }, [isAuthenticated, user, getAuthStatus]);

  React.useEffect(() => {
    setTransitionStage('fade-out');
    const timeout = setTimeout(() => setTransitionStage('fade-in'), 150);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    // Inject @keyframes spin as a <style> tag so animation works
    // on dynamically created elements regardless of CSS load order
    const styleTag = document.createElement('style');
    styleTag.textContent = '@keyframes ptr-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(styleTag);

    // Inline SVG: white refresh arrow on app-theme circle (#25224A).
    // Using data URI means ZERO network request — guaranteed to render before unload.
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
           stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
           width="26" height="26">
        <path d="M21 2v6h-6"/>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
        <path d="M3 22v-6h6"/>
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
      </svg>`;
    const svgUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent);

    // Build overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:flex-start',
      'background:rgba(255,255,255,0.55)',
      'backdrop-filter:blur(10px)', '-webkit-backdrop-filter:blur(10px)',
      'z-index:99999', 'padding-top:22px',
    ].join(';');

    const circle = document.createElement('div');
    circle.style.cssText = [
      'width:54px', 'height:54px', 'display:flex',
      'align-items:center', 'justify-content:center',
      'background:#25224A', 'border-radius:50%',
      'box-shadow:0 4px 20px rgba(37,34,74,0.35)',
      'animation:ptr-spin 0.85s linear infinite',
    ].join(';');

    const img = document.createElement('img');
    img.src = svgUri;
    img.style.cssText = 'width:26px;height:26px;display:block;';

    circle.appendChild(img);
    overlay.appendChild(circle);
    document.body.appendChild(overlay);

    // Two rAFs guarantee the browser has painted the overlay before reload fires
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.location.reload();
      });
    });
  }, [isRefreshing]);

  usePullToRefresh(handleRefresh);

  if (loading) {
    return (
      <div className="spinner-overlay">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      {isRefreshing && (
        <div className="refresh-overlay">
          <div className="refresh-icon-container">
            <img src={refreshIcon} alt="Refreshing..." className="refresh-icon" />
          </div>
        </div>
      )}
      <div className={`page-transition ${transitionStage}`}>
        <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route 
        path="/login" 
        element={
          isAuthenticated 
            ? (user?.onboarding_completed ? <Navigate to="/dashboard" /> : <Navigate to="/onboarding-preferences" />)
            : <Login />
        } 
      />
      <Route 
        path="/signup" 
        element={<Signup />} 
      />
      <Route 
        path="/complete-profile" 
        element={<CompleteProfile />} 
      />
      <Route 
        path="/verify-email" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <EmailVerification />} 
      />

      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/people" element={
        <ProtectedRoute>
          <People />
        </ProtectedRoute>
      } />

      {/* Role-based routes */}
      <Route path="/marketplace" element={
        <ProtectedRoute>
          <Marketplace />
        </ProtectedRoute>
      } />
      
      <Route path="/collaboration" element={
        <ProtectedRoute>
          <Collaboration />
        </ProtectedRoute>
      } />

      <Route path="/startupdetail/:id" element={
        <ProtectedRoute>
          <StartupDetails />
        </ProtectedRoute>
      } />

      {/* Entrepreneur-only routes */}
      <Route path="/createstartup" element={
        <RoleBasedRoute allowedRoles={['entrepreneur']}>
          <CreateStartupProject />
        </RoleBasedRoute>
      } />
      
      <Route path="/pitch-idea" element={
        <RoleBasedRoute allowedRoles={['entrepreneur']}>
          <PitchIdea />
        </RoleBasedRoute>
      } />
      


      {/* Search routes - accessible to all authenticated users */}
      <Route path="/search" element={
        <ProtectedRoute>
          <SearchStartups />
        </ProtectedRoute>
      } />
      

      
      {/* Onboarding Preferences - accessible to all authenticated users */}
      <Route path="/onboarding-preferences" element={
        <ProtectedRoute>
          <OnboardingPreferences />
        </ProtectedRoute>
      } />
      
      {/* Entrepreneur-only routes */}
      <Route path="/startups/:startupId/positions" element={
        <RoleBasedRoute allowedRoles={['entrepreneur']}>
          <PositionManagement />
        </RoleBasedRoute>
      } />
      
      <Route path="/positions/:positionId/applications" element={
        <RoleBasedRoute allowedRoles={['entrepreneur']}>
          <PositionApplications />
        </RoleBasedRoute>
      } />
      
      <Route path="/startups-with-applications" element={
        <RoleBasedRoute allowedRoles={['entrepreneur']}>
          <StartupsWithApplications />
        </RoleBasedRoute>
      } />
      
      <Route path="/startups/:startupId/applications" element={
        <RoleBasedRoute allowedRoles={['entrepreneur']}>
          <StartupApplications />
        </RoleBasedRoute>
      } />
      
      {/* Investor-only routes */}
      <Route path="/investor-dashboard" element={
        <RoleBasedRoute allowedRoles={['investor']}>
          <InvestorDashboard />
        </RoleBasedRoute>
      } />

      {/* Student/Professional and Entrepreneur routes */}
      <Route path="/apply-for-collaboration/:startupId" element={
        <RoleBasedRoute allowedRoles={['student', 'entrepreneur']}>
          <ApplyJob />
        </RoleBasedRoute>
      } />

      {/* General protected routes */}
      <Route path="/account" element={
        <ProtectedRoute>
          <AccountSettingsII />
        </ProtectedRoute>
      } />

      <Route path="/message" element={
        <ProtectedRoute>
          <MessageDark />
        </ProtectedRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
