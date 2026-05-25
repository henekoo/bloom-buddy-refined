import { Link, Outlet, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Leaf, FolderTree, Map as MapIcon, Sprout, LogOut, Plus, Menu, Moon, Sun, Globe2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Kojelauta", icon: LayoutDashboard },
  { to: "/explore", label: "Tutki lajeja", icon: Globe2 },
  { to: "/observations", label: "Havainnot", icon: Leaf },
  { to: "/projects", label: "Projektit", icon: FolderTree },
  { to: "/map", label: "Kartta", icon: MapIcon },
  { to: "/species", label: "Lajit", icon: Sprout },
] as const;

// Mobile bottom nav shows the 4 most-used entries
const MOBILE_NAV = [
  { to: "/dashboard", label: "Koti", icon: LayoutDashboard },
  { to: "/observations", label: "Havainnot", icon: Leaf },
  { to: "/map", label: "Kartta", icon: MapIcon },
  { to: "/projects", label: "Projektit", icon: FolderTree },
] as const;

export function AppShell() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (desktop) + Drawer (mobile) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in"
          aria-hidden
        />
      )}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 md:translate-x-0 md:w-64 md:relative",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl gradient-leaf grid place-items-center shadow-leaf">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">Florea</div>
              <div className="text-xs text-muted-foreground">Kasvihavainnot</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="md:hidden">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="group flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5 transition-all duration-200"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-soft" }}
            >
              <item.icon className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <Button asChild className="w-full gradient-leaf text-primary-foreground border-0 shadow-leaf hover:shadow-elegant hover:brightness-110 transition-all">
            <Link to="/observations/new" onClick={() => setOpen(false)}>
              <Plus className="h-4 w-4 mr-1" /> Uusi havainto
            </Link>
          </Button>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="truncate">{user?.email}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={toggleDark} className="h-8 w-8">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={async () => { await signOut(); router.navigate({ to: "/auth" }); }} className="h-8 w-8">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 glass border-b border-border flex items-center justify-between px-4 h-14">
        <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label="Avaa valikko">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg gradient-leaf grid place-items-center"><Leaf className="h-4 w-4 text-primary-foreground" /></div>
          <span className="font-semibold">Florea</span>
        </div>
        <Button asChild size="icon" className="gradient-leaf text-primary-foreground border-0 shadow-leaf">
          <Link to="/observations/new" aria-label="Uusi havainto"><Plus className="h-4 w-4" /></Link>
        </Button>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-10 animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-border h-16 grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors active:scale-95"
            activeProps={{ className: "text-primary font-medium" }}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
