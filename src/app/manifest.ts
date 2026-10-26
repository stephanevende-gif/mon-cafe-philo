import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mon café philo",
    short_name: "Café philo",
    description: "Chaque jour, une question. Chaque jour, l'exercice de penser.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfef9",
    theme_color: "#fdfef9",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
