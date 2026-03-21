import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suno Pocket Studio",
    short_name: "Pocket Studio",
    description: "PWA semplice per generare canzoni con Suno API e ascoltarle dal telefono.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe5",
    theme_color: "#12312a",
    lang: "it-IT",
    orientation: "portrait",
    categories: ["music", "entertainment", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
