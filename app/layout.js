import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import { StoreProvider } from "@/components/StoreProvider";
import Shell from "@/components/Shell";

export const metadata = {
  title: {
    default: "VECTOR — Digital resources for people who build.",
    template: "%s · VECTOR",
  },
  description:
    "Templates, systems and tools engineered for real work. Notion systems, UI kits, developer tools and technical guides. (Demo build — no real payments.)",
  applicationName: "VECTOR",
  appleWebApp: { capable: true, title: "VECTOR", statusBarStyle: "default" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F4F3EF",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LangProvider>
          <StoreProvider>
            <Shell>{children}</Shell>
          </StoreProvider>
        </LangProvider>
      </body>
    </html>
  );
}
