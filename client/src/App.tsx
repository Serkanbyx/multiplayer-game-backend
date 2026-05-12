import { Routes, Route, useLocation } from 'react-router-dom';
import { MainLayout, AdminLayout, SettingsLayout } from './components/layout';
import {
  ProtectedRoute,
  AdminRoute,
  GuestOnlyRoute,
  RegisteredOnlyRoute,
} from './components/guards';
import { useAnimations } from './hooks/useAnimations';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GuestEntryPage from './pages/GuestEntryPage';
import GameRoomPage from './pages/GameRoomPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PublicProfilePage from './pages/PublicProfilePage';
import MyProfilePage from './pages/MyProfilePage';
import NotFoundPage from './pages/NotFoundPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRooms from './pages/admin/AdminRooms';
import AdminMatches from './pages/admin/AdminMatches';

import ProfileSettings from './pages/settings/ProfileSettings';
import AccountSettings from './pages/settings/AccountSettings';
import AppearanceSettings from './pages/settings/AppearanceSettings';
import NotificationSettings from './pages/settings/NotificationSettings';
import PrivacySettings from './pages/settings/PrivacySettings';

function App() {
  const location = useLocation();

  /* Keeps no-animations class on <html> in sync with preference + system */
  useAnimations();

  return (
    <div key={location.pathname} className="animate-page-fade">
      <Routes location={location}>
        {/* Public routes inside MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/u/:username" element={<PublicProfilePage />} />

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
            <Route path="/profile" element={<MyProfilePage />} />

            {/* Settings with nested layout */}
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<ProfileSettings />} />
              <Route path="account" element={<AccountSettings />} />
              <Route path="appearance" element={<AppearanceSettings />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="privacy" element={<PrivacySettings />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="rooms" element={<AdminRooms />} />
              <Route path="matches" element={<AdminMatches />} />
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
