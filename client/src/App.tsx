import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { MainLayout, AdminLayout, SettingsLayout } from './components/layout';
import {
  ProtectedRoute,
  AdminRoute,
  GuestOnlyRoute,
  RegisteredOnlyRoute,
} from './components/guards';
import { useAnimations } from './hooks/useAnimations';
import { usePageFocus } from './hooks/usePageFocus';
import { Spinner } from './components/ui';

/* Critical path — eagerly loaded */
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GuestEntryPage from './pages/GuestEntryPage';
import GameRoomPage from './pages/GameRoomPage';
import NotFoundPage from './pages/NotFoundPage';

/* Lazy-loaded routes — visited rarely or by subset of users */
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
const MyProfilePage = lazy(() => import('./pages/MyProfilePage'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminRooms = lazy(() => import('./pages/admin/AdminRooms'));
const AdminMatches = lazy(() => import('./pages/admin/AdminMatches'));

const ProfileSettings = lazy(() => import('./pages/settings/ProfileSettings'));
const AccountSettings = lazy(() => import('./pages/settings/AccountSettings'));
const AppearanceSettings = lazy(() => import('./pages/settings/AppearanceSettings'));
const NotificationSettings = lazy(() => import('./pages/settings/NotificationSettings'));
const PrivacySettings = lazy(() => import('./pages/settings/PrivacySettings'));

const LazyFallback = () => <Spinner center />;

function App() {
  const location = useLocation();

  /* Keeps no-animations class on <html> in sync with preference + system */
  useAnimations();

  /* Focus <h1> on route change for screen reader announcement */
  usePageFocus();

  return (
    <div key={location.pathname} className="animate-page-fade">
      <Routes location={location}>
        {/* Public routes inside MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/leaderboard"
            element={<Suspense fallback={<LazyFallback />}><LeaderboardPage /></Suspense>}
          />
          <Route
            path="/u/:username"
            element={<Suspense fallback={<LazyFallback />}><PublicProfilePage /></Suspense>}
          />

          {/* Guest-only routes (redirect if already authenticated) */}
          <Route element={<GuestOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/guest" element={<GuestEntryPage />} />
          </Route>

          {/* Protected routes (must be logged in) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/room/:roomCode" element={<GameRoomPage />} />
          </Route>

          {/* Registered-only routes (logged in + not guest) */}
          <Route element={<RegisteredOnlyRoute />}>
            <Route
              path="/profile"
              element={<Suspense fallback={<LazyFallback />}><MyProfilePage /></Suspense>}
            />

            {/* Settings with nested layout */}
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Suspense fallback={<LazyFallback />}><ProfileSettings /></Suspense>} />
              <Route path="account" element={<Suspense fallback={<LazyFallback />}><AccountSettings /></Suspense>} />
              <Route path="appearance" element={<Suspense fallback={<LazyFallback />}><AppearanceSettings /></Suspense>} />
              <Route path="notifications" element={<Suspense fallback={<LazyFallback />}><NotificationSettings /></Suspense>} />
              <Route path="privacy" element={<Suspense fallback={<LazyFallback />}><PrivacySettings /></Suspense>} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Suspense fallback={<LazyFallback />}><AdminDashboard /></Suspense>} />
              <Route path="users" element={<Suspense fallback={<LazyFallback />}><AdminUsers /></Suspense>} />
              <Route path="rooms" element={<Suspense fallback={<LazyFallback />}><AdminRooms /></Suspense>} />
              <Route path="matches" element={<Suspense fallback={<LazyFallback />}><AdminMatches /></Suspense>} />
            </Route>
          </Route>

          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
