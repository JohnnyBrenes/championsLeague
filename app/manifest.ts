import type { MetadataRoute } from "next";

// Next treats manifest.ts as a route handler, which `output: "export"` refuses
// to build unless it is explicitly declared static. The manifest is a constant,
// so this just tells the exporter to write it out at build time.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Champions 2026/27 — Calendario y Eliminatorias",
    short_name: "Champions 26/27",
    description:
      "Calendario, resultados, fase liga y eliminatorias de la Champions League 2026/27. Sitio no oficial, sin afiliación con la UEFA.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a7d52",
    theme_color: "#0a7d52",
    lang: "es",
    categories: ["sports"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
