import { Routes, Route, Navigate, Outlet, useLocation } from "react-router";
import { DashboardLayout } from "./components/layout/dashboard-layout";
import { DashboardPage } from "./pages/dashboard";
import { AccountsPage } from "./pages/accounts";
import { LandingPage } from "./pages/landing";
import { AuthPage } from "./pages/auth";
import { getSessionToken } from "./lib/api-client";

// Placeholder pages (will be built in subsequent modules)
function FavoritesPage() {
  return <div className="p-4"><h2>Favorites</h2><p className="text-muted-foreground mt-2">Your pinned accounts.</p></div>;
}

function AnalyticsPage() {
  return <div className="p-4"><h2>Detailed Analytics</h2><p className="text-muted-foreground mt-2">Deep dive into engagement metrics.</p></div>;
}

function SettingsPage() {
  return <div className="p-4"><h2>Settings</h2><p className="text-muted-foreground mt-2">App configuration.</p></div>;
}

function RequireAuth() {
  const location = useLocation();

  if (!getSessionToken()) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  return <Outlet />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
