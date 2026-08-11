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

function NextActionPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <section className="max-w-2xl rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">InstaData Setup</h1>
        <p className="mt-3 text-muted-foreground">
          This public Netlify site is for Meta verification pages. Use these URLs in Meta App Settings:
        </p>
        <div className="mt-6 space-y-3 text-sm">
          <p>
            <span className="font-medium">Privacy Policy:</span>{" "}
            <a className="text-primary underline" href="/privacy.html">/privacy.html</a>
          </p>
          <p>
            <span className="font-medium">Data Deletion:</span>{" "}
            <a className="text-primary underline" href="/delete-data.html">/delete-data.html</a>
          </p>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Run the dashboard locally while the backend is on your machine.
        </p>
      </section>
    </main>
  );
}

function App() {
  const shouldUseSetupPage = import.meta.env.PROD;

  return (
    <Routes>
      {shouldUseSetupPage ? (
        <>
          <Route path="/" element={<NextActionPage />} />
          <Route path="/dashboard" element={<NextActionPage />} />
          <Route path="/accounts" element={<NextActionPage />} />
          <Route path="/favorites" element={<NextActionPage />} />
          <Route path="/analytics" element={<NextActionPage />} />
          <Route path="/settings" element={<NextActionPage />} />
        </>
      ) : (
        <>
          <Route path="/" element={<LandingPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </>
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
