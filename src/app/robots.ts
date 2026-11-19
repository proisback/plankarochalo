import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Public: the landing page, the demo and the case study.
// Private: trip links (they are invitations), the organiser's pages, and dev tools.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/trip/", "/create", "/login", "/auth/", "/dev/", "/demo/preview/"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
