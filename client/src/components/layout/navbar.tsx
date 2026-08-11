import { Link } from "react-router";
import { Activity, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { AddLinkModal } from "@/components/modals/add-link-modal";

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-[65px] border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-6">
      <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
          <Activity className="w-5 h-5" />
        </div>
        <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-foreground">
          InstaData
        </span>
      </Link>

      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <AddLinkModal />
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          )}
        </Button>
      </div>
    </header>
  );
}
