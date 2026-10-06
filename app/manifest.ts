import type { MetadataRoute } from "next";

/** ให้ติดตั้งเป็นแอปบนมือถือได้ (Add to Home Screen) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VECTOR — Digital resources for people who build",
    short_name: "VECTOR",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F3EF",
    theme_color: "#F4F3EF",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
