import type { Metadata } from "next";

import "~/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "MediaSync",
    template: "%s | MediaSync",
  },
  description:
    "Ruang kerja kolaborasi tim multimedia: tugas transparan, keputusan terdokumentasi, evaluasi adil.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
