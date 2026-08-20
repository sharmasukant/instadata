import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { authApi, getSessionToken } from "@/lib/api-client";

type AuthMode = "login" | "register";

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnTo = searchParams.get("returnTo") || "/dashboard";

  if (getSessionToken()) {
    return <Navigate to={returnTo} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await authApi.login(email.trim(), password);
        toast.success("Welcome back");
      } else {
        await authApi.register(email.trim(), password);
        toast.success("Account created");
      }

      navigate(returnTo, { replace: true });
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.message ||
        (mode === "login" ? "Login failed" : "Registration failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="h-[72px] border-b border-border/40 bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 lg:px-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">InstaData</span>
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-6 py-12">
        <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === "login" ? "Sign in" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Use your InstaData account to open the dashboard.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode("register")}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </section>
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
