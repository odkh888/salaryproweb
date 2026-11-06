import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MoneyFlow — личные финансы",
    short_name: "MoneyFlow",
    description: "Умный трекер доходов и расходов с аналитикой",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0f172a",
    theme_color: "#6366f1",
    categories: ["finance", "productivity"],
    lang: "ru",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Новая транзакция",
        short_name: "Транзакция",
        url: "/?new=true",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Мои счета",
        short_name: "Счета",
        url: "/accounts",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
