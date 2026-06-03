import React, { Suspense, lazy, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ── Static imports (tiny, needed immediately at app boot) ────────────────────
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute/RoleBasedRoute';

// ── Lazy-loaded page components ───────────────────────────────────────────────
// Each lazy() call creates a separate JS chunk in the production build.
// The browser only downloads a page's chunk when the user first navigates to it.
// This reduces the initial JS payload from ~2 MB to ~300 KB.

// Auth / onboarding
const Login = lazy(() => import('./components/login/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./components/Signup/Signup'));
const EmailVerification = lazy(() => import('./components/EmailVerification/EmailVerification'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile/CompleteProfile'));
const OnboardingPreferences = lazy(() => import('./pages/OnboardingPreferences/OnboardingPreferences'));

// Public marketing pages
const LandingPage = lazy(() => import('./pages/LandingPage/LandingPage').then(m => ({ default: m.LandingPage })));
const About = lazy(() => import('./pages/About/About'));
const Contact = lazy(() => import('./pages/Contact/Contact'));
const FAQ = lazy(() => import('./pages/FAQ/FAQ'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService/TermsOfService'));

// SEO programmatic pages (public)
const ProgrammaticSEOPage = lazy(() => import('./pages/ProgrammaticSEO/ProgrammaticSEOPage'));

// Core app pages (authenticated)
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Marketplace = lazy(() => import('./pages/Marketplace/Marketplace').then(m => ({ default: m.Marketplace })));
const Collaboration = lazy(() => import('./pages/Collaboration/Collaboration').then(m => ({ default: m.Collaboration })));
const StartupDetails = lazy(() => import('./pages/StartupDetails/StartupDetails'));
const People = lazy(() => import('./pages/People/People'));
const Favorites = lazy(() => import('./pages/Favorites/Favorites'));
const SearchStartups = lazy(() => import('./pages/Search/SearchStartups'));
const MessageDark = lazy(() => import('./pages/message/MessageDark'));

// Account
const AccountSettingsII = lazy(() => import('./pages/AccountSettings/AccountSettingsII'));

// Entrepreneur-only pages
const CreateStartupProject = lazy(() => import('./pages/CreateStartup/CreateStartupProject'));
const PitchIdea = lazy(() => import('./pages/PitchIdea/PitchIdea'));
const PositionManagement = lazy(() => import('./pages/PositionManagement/PositionManagement'));
const PositionApplications = lazy(() => import('./pages/PositionApplications/PositionApplications'));
const StartupsWithApplications = lazy(() => import('./pages/StartupsWithApplications/StartupsWithApplications'));
const StartupApplications = lazy(() => import('./pages/StartupApplications/StartupApplications'));

// Role-restricted pages
const ApplyJob = lazy(() => import('./pages/ApplyJob/ApplyJob'));
const InvestorDashboard = lazy(() => import('./pages/InvestorDashboard/InvestorDashboard'));

// Admin portal pages (lazy loaded, only fetched when navigating to /portal)
const PortalOverview = lazy(() => import('./pages/Portal/PortalOverview'));
const PortalStartups = lazy(() => import('./pages/Portal/PortalStartups'));
const PortalStartupDetail = lazy(() => import('./pages/Portal/PortalStartupDetail'));
const PortalUsers = lazy(() => import('./pages/Portal/PortalUsers'));
const PortalLogin = lazy(() => import('./pages/Portal/PortalLogin'));

// ── Admin-only route guard ────────────────────────────────────────────────────
function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated || !isAdmin()) return <Navigate to="/portal/login" replace />;
  return children;
}

// ── Page transition spinner (shown while lazy chunks load) ───────────────────
function PageLoader() {
  return (
    <div className="spinner-overlay" role="status" aria-label="Loading page">
      <div className="spinner" />
    </div>
  );
}

// ── Scroll to top on route change ────────────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// ── Pull-to-refresh (mobile) ─────────────────────────────────────────────────
function usePullToRefresh(onRefresh) {
  const startY = useRef(0);
  const isPulling = useRef(false);
  const THRESHOLD = 80;

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };
    const onTouchMove = (e) => {
      if (!isPulling.current) return;
      if (e.touches[0].clientY - startY.current > THRESHOLD) {
        isPulling.current = 'triggered';
      }
    };
    const onTouchEnd = () => {
      if (isPulling.current === 'triggered') onRefresh();
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

// ── Main routed application ───────────────────────────────────────────────────
function AppRoutes() {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();
  const [transitionStage, setTransitionStage] = React.useState('fade-in');
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [showAuthRouteLoader, setShowAuthRouteLoader] = React.useState(false);
  const previousPathRef = useRef(location.pathname);

  // Page transition animation
  useEffect(() => {
    setTransitionStage('fade-out');
    const t = setTimeout(() => setTransitionStage('fade-in'), 150);
    return () => clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';
    previousPathRef.current = location.pathname;

    if (!isAuthRoute || previousPath === location.pathname) {
      setShowAuthRouteLoader(false);
      return undefined;
    }

    setShowAuthRouteLoader(true);
    const t = setTimeout(() => setShowAuthRouteLoader(false), 350);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    const styleTag = document.createElement('style');
    styleTag.textContent = '@keyframes ptr-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(styleTag);

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

    requestAnimationFrame(() => {
      requestAnimationFrame(() => { window.location.reload(); });
    });
  }, [isRefreshing]);

  usePullToRefresh(handleRefresh);

  // Show full-screen spinner while AuthContext resolves session
  if (loading) {
    return <PageLoader />;
  }

  return (
    <>
      <ScrollToTop />
      <ToastContainer position="top-right" autoClose={3000} />
      {showAuthRouteLoader && <PageLoader />}

      {/* Suspense catches lazy chunk loading — shows spinner during navigation */}
      <Suspense fallback={<PageLoader />}>
        <div className={`page-transition ${transitionStage}`}>
          <Routes>

            {/* ── Public routes ──────────────────────────────────────────── */}
            <Route path="/" element={<LandingPage />} />

            <Route
              path="/login"
              element={
                isAuthenticated
                  ? (user?.onboarding_completed
                    ? <Navigate to="/search" replace />
                    : <Navigate to="/onboarding-preferences" replace />)
                  : <Login />
              }
            />

            <Route path="/signup" element={<Signup />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />

            <Route
              path="/verify-email"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <EmailVerification />}
            />

            {/* ── Programmatic SEO public routes ─────────────────────────── */}
            <Route path="/jobs/:param" element={<ProgrammaticSEOPage />} />
            <Route path="/internships/:param" element={<ProgrammaticSEOPage />} />
            <Route path="/startups/:param" element={<ProgrammaticSEOPage />} />
            <Route path="/collaborate/:param" element={<ProgrammaticSEOPage />} />
            <Route path="/remote/:param" element={<ProgrammaticSEOPage />} />
            <Route path="/opportunities/:param" element={<ProgrammaticSEOPage />} />

            {/* ── Protected routes (requires auth) ───────────────────────── */}
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/people" element={
              <ProtectedRoute><People /></ProtectedRoute>
            } />
            <Route path="/marketplace" element={
              <ProtectedRoute><Marketplace /></ProtectedRoute>
            } />
            <Route path="/collaboration" element={
              <ProtectedRoute><Collaboration /></ProtectedRoute>
              //<Collaboration />
            } />
            <Route path="/startupdetail/:id" element={
              <ProtectedRoute><StartupDetails /></ProtectedRoute>
            } />
            <Route path="/search" element={
              <ProtectedRoute><SearchStartups /></ProtectedRoute>
              //<SearchStartups />
            } />
            <Route path="/favorites" element={
              <ProtectedRoute><Favorites /></ProtectedRoute>
              //<Favorites />
            } />
            <Route path="/account" element={
              <ProtectedRoute><AccountSettingsII /></ProtectedRoute>
              //<AccountSettingsII />
            } />
            <Route path="/message" element={
              <ProtectedRoute><MessageDark /></ProtectedRoute>
            } />

            <Route path="/onboarding-preferences" element={
              <ProtectedRoute><OnboardingPreferences /></ProtectedRoute>
            } />

            {/* ── Entrepreneur-only routes ────────────────────────────────── */}
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

            {/* ── Investor-only routes ────────────────────────────────────── */}
            <Route path="/investor-dashboard" element={
              <RoleBasedRoute allowedRoles={['investor']}>
                <InvestorDashboard />
              </RoleBasedRoute>
            } />

            {/* ── Student / Entrepreneur routes ───────────────────────────── */}
            <Route path="/apply-for-collaboration/:startupId" element={
              <RoleBasedRoute allowedRoles={['student', 'entrepreneur']}>
                <ApplyJob />
              </RoleBasedRoute>
            } />

            {/* ── Admin portal routes ─────────────────────────────────────── */}
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal" element={
              <AdminRoute><PortalOverview /></AdminRoute>
            } />
            <Route path="/portal/startups" element={
              <AdminRoute><PortalStartups /></AdminRoute>
            } />
            <Route path="/portal/startups/:id" element={
              <AdminRoute><PortalStartupDetail /></AdminRoute>
            } />
            <Route path="/portal/users" element={
              <AdminRoute><PortalUsers /></AdminRoute>
            } />

            {/* ── Catch-all: redirect unknown routes to home ──────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </div>
      </Suspense>
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
