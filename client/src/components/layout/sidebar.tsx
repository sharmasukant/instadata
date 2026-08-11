import { NavLink } from "react-router";
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings, 
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Accounts", path: "/accounts" },
  { icon: Star, label: "Favorites", path: "/favorites" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl flex-col hidden md:flex h-[calc(100vh-65px)] sticky top-[65px]">
      <div className="p-4 flex-1">
        <div className="space-y-1 mb-8">
          <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Main Menu
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="space-y-1">
          <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Other
          </p>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Settings className="w-5 h-5" />
            Settings
          </NavLink>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <div className="bg-primary/10 rounded-xl p-4 text-center">
          <h4 className="font-semibold text-primary text-sm mb-1">Premium Plan</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Track unlimited profiles
          </p>
          <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs py-2 rounded-lg font-medium transition-colors">
            Upgrade Now
          </button>
        </div>
      </div>
    </aside>
  );
}
