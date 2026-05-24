import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Leaf, Map as MapIcon, FolderTree, Sparkles, Camera, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  return (
    <div className="min-h-screen">
      <header className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl gradient-leaf grid place-items-center shadow-leaf">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight text-lg">Florea</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost">Kirjaudu</Button>
        </Link>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-12 md:pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-border text-xs text-muted-foreground mb-6 animate-fade-in">
          <Sparkles className="h-3 w-3 text-primary" /> Premium-tason luontosovellus
        </div>
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] animate-rise">
          Luontosi <span className="text-gradient-leaf">elävänä arkistona</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto animate-rise">
          Tallenna kasvihavainnot, hallitse pihaa, mökkiä, metsäpalstaa tai arboretumia
          — ja seuraa lajistoasi kauniilla kartalla.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 animate-rise">
          <Link to="/auth">
            <Button size="lg" className="gradient-leaf text-primary-foreground border-0 shadow-leaf">
              Aloita ilmaiseksi <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-4 text-left">
          {[
            { icon: Camera, title: "Havainnot kuvilla", body: "Tallenna laji, sijainti, kuvat ja muistiinpanot puhelimella." },
            { icon: FolderTree, title: "Projektit", body: "Talon piha, mökki, arboretum, kasvihuone — kokoa havainnot kokonaisuuksiksi." },
            { icon: MapIcon, title: "Kaikki kartalla", body: "Klusteroitu kartta, satelliittinäkymä ja popupit kuvilla." },
          ].map((f, i) => (
            <div key={i} className="card-hover rounded-2xl border border-border bg-card p-6">
              <div className="h-10 w-10 rounded-xl gradient-leaf grid place-items-center mb-4 shadow-leaf">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Florea
      </footer>
    </div>
  );
}
