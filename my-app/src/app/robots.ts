import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/receipt/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/receipt/"],
      },
    ],
    sitemap: "https://www.campusweb.co.in/sitemap.xml",
    host: "https://www.campusweb.co.in",
  };
}
