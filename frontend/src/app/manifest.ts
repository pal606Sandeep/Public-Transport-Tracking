import type { MetadataRoute } from "next";

/**
 * Web App Manifest — served at `/manifest.webmanifest` by Next's metadata route.
 * `display: standalone` + a maskable icon is what makes Chrome/Edge offer
 * "Install app" and what iOS uses for "Add to Home Screen".
 *
 * Icons are a single scalable SVG (`sizes: "any"`). Drop real PNG raster icons
 * (192 / 512 / maskable) into `public/` and add them here for best fidelity on
 * older Android launchers.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Transit — live bus tracking",
    short_name: "Transit",
    description:
      "Real-time public transport tracking for small cities — live buses, routes, stops, tickets and alerts.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f7f8",
    theme_color: "#111318",
    categories: ["travel", "navigation", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Live map", url: "/map" },
      { name: "Routes", url: "/routes" },
      { name: "My tickets", url: "/tickets" },
    ],
  };
}
