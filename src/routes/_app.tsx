import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="h-12 w-12 rounded-2xl gradient-leaf grid place-items-center animate-pulse shadow-leaf">
          <Leaf className="h-6 w-6 text-primary-foreground" />
        </div>
      </div>
    );
  }
  return <AppShell />;
}
