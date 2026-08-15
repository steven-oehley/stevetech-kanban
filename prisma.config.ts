import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrate needs the unpooled endpoint; the app's runtime connection uses the
  // pooled DATABASE_URL, set up in src/lib/prisma.ts.
  datasource: { url: env("DIRECT_URL") },
});
