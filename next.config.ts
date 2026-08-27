import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: every page is built from the committed data/*.json, so
  // there is nothing to render at request time. The export is what lets us host
  // for free outside Vercel (Cloudflare Pages serves ./out) — see DEPLOY.md.
  // Consequence: no route handlers, server actions, ISR or dynamic APIs.
  output: "export",
  // next/image's optimizer is a server feature and doesn't exist in an export;
  // club crests are small local PNGs, so there is nothing to optimize anyway.
  images: { unoptimized: true },
  // Emit /schedule/index.html rather than /schedule.html, so static hosts
  // resolve the route with or without the trailing slash.
  trailingSlash: true,
};

export default nextConfig;
