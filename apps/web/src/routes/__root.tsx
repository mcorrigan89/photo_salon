import { type QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Photo Salon" },
    ],
    links: [
      { rel: "preload", href: appCss, as: "style" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => <div>404 - Not Found</div>,
  errorComponent: ({ error }) => (
    <div>
      <h1>500 - Server Error</h1>
      <pre>{error.message}</pre>
    </div>
  ),
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const serverUrl = process.env.SERVER_URL ?? "http://localhost:3001";
  const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3000";
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__SERVER_URL__=${JSON.stringify(serverUrl)};window.__CLIENT_URL__=${JSON.stringify(clientUrl)}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){d.classList.add('dark')}else{d.classList.remove('dark')}})()`,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
        <Scripts />
      </body>
    </html>
  );
}
