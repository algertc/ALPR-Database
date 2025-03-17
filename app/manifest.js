export default function manifest() {
  return {
    theme_color: "#000000",
    background_color: "#09090b",
    icons: [
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "icon512_maskable.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "icon512_rounded.png",
        type: "image/png",
      },
    ],
    orientation: "any",
    display: "standalone",
    dir: "auto",
    lang: "en-US",
    name: "ALPR Database",
    short_name: "ALPR",
    start_url: "/",
    scope: "/",
    description: "algertc/alpr-database",
  };
}
