// Prisma 7 Configuration pour Vercel PostgreSQL
// npm install --save-dev prisma dotenv
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { defineConfig } from "prisma/config";

// Charger .env.local en priorité pour développement
expand(config({ path: ".env.local" }));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    // Vercel configure automatiquement POSTGRES_PRISMA_URL en production
    url: process.env["POSTGRES_PRISMA_URL"] || process.env["DATABASE_URL"] || "",
  },
});
