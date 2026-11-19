import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/demo`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/story`, changeFrequency: "monthly", priority: 0.7 },
  ];
}
