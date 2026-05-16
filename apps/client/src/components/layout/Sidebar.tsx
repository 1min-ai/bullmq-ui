import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  Briefcase,
  Server,
  Activity,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { queuesApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/queues", label: "Queues", icon: Layers },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/workers", label: "Workers", icon: Activity },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authEnabled, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const { data: queues } = useQuery({
    queryKey: ["queues"],
    queryFn: queuesApi.list,
    refetchInterval: 15_000,
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <Link to="/" className="flex h-14 items-center gap-2.5 px-4 border-b border-sidebar-border hover:opacity-80 transition-opacity">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          <Server className="h-4 w-4 text-primary" />
        </div>
        <span className="font-semibold text-sm text-sidebar-foreground">
          BullMQ
        </span>
      </Link>

      <ScrollArea className="flex-1 py-3">
        <nav className="px-2 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact
              ? location.pathname === to
              : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {queues && queues.length > 0 && (
          <>
            <Separator className="my-3 mx-2 bg-sidebar-border" />
            <div className="px-4 pb-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Queues
              </p>
            </div>
            <nav className="px-2 space-y-0.5">
              {queues.map((q) => (
                <NavLink
                  key={q.name}
                  to={`/queues/${encodeURIComponent(q.name)}`}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between rounded-md px-3 py-1.5 text-xs transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )
                  }
                >
                  <span className="truncate font-mono">{q.name}</span>
                  {q.isPaused && (
                    <span className="text-[10px] text-muted-foreground ml-1">
                      paused
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </ScrollArea>

      {authEnabled && (
        <div className="p-2 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
