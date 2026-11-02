import { previewOrigin } from "../lib/deployment";
import { FONT_REGISTRY } from "../../scripts/typography-registry.mjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: previewOrigin(),
  robots: { index: false, follow: false, noarchive: true },
  title: "kspf.studio",
  description: "kspf is a digital practice.",
};

const fontStylesheets = Array.from(new Set(
  Object.values(FONT_REGISTRY).flatMap((font) => font.stylesheet ? [font.stylesheet] : [])
));

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {fontStylesheets.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
