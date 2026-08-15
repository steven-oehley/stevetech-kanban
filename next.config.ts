import type { NextConfig } from "next";

/**
 * This app is a CHILD zone of the stevetech multi-zone platform: the browser
 * only ever talks to the host (stevetech.co.za / localhost:3000), which
 * rewrites /kanban and /kanban-static here.
 *
 * - basePath makes every route and internal link render as /kanban/...
 * - assetPrefix keeps this zone's static chunks on a path the host proxies
 *   separately, so they never collide with the host's own /_next assets.
 */
const nextConfig: NextConfig = {
  basePath: "/kanban",
  assetPrefix: "/kanban-static",
};

export default nextConfig;
