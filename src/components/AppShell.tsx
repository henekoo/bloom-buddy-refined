import { Link, Outlet, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Leaf, FolderTree, Map as MapIcon, Sprout, LogOut, Plus, Menu, Moon, Sun, Globe2 } from "lucide-react";
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
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex-col transition-transform md:translate-x-0 md:flex md:relative",
        open ? "translate-x-0 flex" : "-translate-x-full hidden md:flex"
      )}>
        <div className="px-5 py-6 flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl gradient-leaf grid place-items-center shadow-leaf">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">Florea</div>
            <div className="text-xs text-muted-foreground">Kasvihavainnot</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
            >
              <item.icon className="h-4 w-4 text-primary" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <Link to="/observations/new" onClick={() => setOpen(false)}>
            <Button className="w-full gradient-leaf text-primary-foreground border-0 shadow-leaf">
              <Plus className="h-4 w-4 mr-1" /> Uusi havainto
            </Button>
          </Link>
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
        <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg gradient-leaf grid place-items-center"><Leaf className="h-4 w-4 text-primary-foreground" /></div>
          <span className="font-semibold">Florea</span>
        </div>
        <Link to="/observations/new"><Button size="icon" className="gradient-leaf text-primary-foreground border-0"><Plus className="h-4 w-4" /></Button></Link>
      </div>

      <main className="flex-1 min-w-0 md:pl-0 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
