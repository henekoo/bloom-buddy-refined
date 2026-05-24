import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) nav({ to: "/dashboard" }); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Tili luotu! Tarkista sähköposti vahvistuslinkkiä varten.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Tervetuloa takaisin!");
        nav({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Virhe kirjautumisessa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-rise">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl gradient-leaf grid place-items-center mx-auto shadow-leaf">
            <Leaf className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-semibold mt-4">{mode === "login" ? "Tervetuloa takaisin" : "Luo tili"}</h1>
          <p className="text-muted-foreground text-sm mt-1">Florea — luontohavaintojen koti</p>
        </div>

        <form onSubmit={submit} className="glass border border-border rounded-2xl p-6 space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Nimi</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Esim. Anna Aalto" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Sähköposti</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Salasana</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-leaf text-primary-foreground border-0 shadow-leaf">
            {loading ? "Hetki..." : mode === "login" ? "Kirjaudu sisään" : "Luo tili"}
          </Button>
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full text-sm text-muted-foreground hover:text-foreground">
            {mode === "login" ? "Ei vielä tiliä? Rekisteröidy" : "Onko jo tili? Kirjaudu"}
          </button>
        </form>
      </div>
    </div>
  );
}
