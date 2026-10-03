import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
        <img src="/logo-asaindo.png" alt="Logo ASAINDO" className="mx-auto mb-4 h-14 w-14 object-contain" />
        <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          SPAKE • Universitas Asa Indonesia
        </div>
        <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-foreground">404</h1>
        <h2 className="mt-2 text-lg font-bold text-foreground">Halaman Tidak Ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tautan atau alamat yang Anda tuju tidak tersedia atau telah dipindahkan dalam sistem SPAKE.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Kembali ke Beranda
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
        <img src="/logo-asaindo.png" alt="Logo ASAINDO" className="mx-auto mb-4 h-14 w-14 object-contain" />
        <div className="inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
          SPAKE • D3 Perhotelan ASAINDO
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">
          Terjadi Kendala Memuat Halaman
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sistem Pengadaan Kampus ASAINDO mendeteksi kendala pada pemrosesan data halaman ini. Silakan muat ulang atau kembali ke beranda.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Muat Ulang Halaman
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Kembali ke Beranda
          </a>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Universitas Asa Indonesia • Sistem Pengadaan Kampus
        </p>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
       { name: "author", content: "SPAKE" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/logo-asaindo.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
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
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
