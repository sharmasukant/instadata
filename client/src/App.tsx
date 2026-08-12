import { Routes, Route, Navigate } from "react-router";
import { DashboardLayout } from "./components/layout/dashboard-layout";
import { DashboardPage } from "./pages/dashboard";
import { AccountsPage } from "./pages/accounts";
import { LandingPage } from "./pages/landing";

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

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
