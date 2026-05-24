import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-leaf">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Sivua ei löytynyt</h2>
        <p className="mt-2 text-sm text-muted-foreground">Etsimääsi sivua ei ole olemassa.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md gradient-leaf text-primary-foreground px-4 py-2 text-sm font-medium shadow-leaf">
            Etusivulle
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Sivun lataus epäonnistui</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md gradient-leaf text-primary-foreground px-4 py-2 text-sm font-medium">Yritä uudelleen</button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">Etusivulle</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#3a7a4a" },
      { title: "Florea — Kasvihavainnot ja luontoprojektit" },
      { name: "description", content: "Tallenna kasvihavaintosi, hallitse luontoprojekteja ja seuraa lajistoa kartalla." },
      { property: "og:title", content: "Florea — Kasvihavainnot ja luontoprojektit" },
      { property: "og:description", content: "Tallenna kasvihavaintosi, hallitse luontoprojekteja ja seuraa lajistoa kartalla." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Florea — Kasvihavainnot ja luontoprojektit" },
      { name: "twitter:description", content: "Tallenna kasvihavaintosi, hallitse luontoprojekteja ja seuraa lajistoa kartalla." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b53ee9c4-b3af-4ecc-872b-df62bd498079/id-preview-db1ba543--2ce20db5-f0f0-48b9-a3c4-0a593d280c37.lovable.app-1779559514746.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b53ee9c4-b3af-4ecc-872b-df62bd498079/id-preview-db1ba543--2ce20db5-f0f0-48b9-a3c4-0a593d280c37.lovable.app-1779559514746.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
