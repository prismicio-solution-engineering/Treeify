/**
 * Central, env-driven configuration for Treeify.
 *
 * A customer copying this template into their own repo only needs to set:
 *   PRISMIC_REPO         — the repository name/domain (e.g. "my-repo")
 *   PRISMIC_READ_TOKEN   — (optional) a permanent Content API access token,
 *                          required only if the repo's API is not public.
 *
 * If PRISMIC_REPO is not set we fall back to `repositoryName` in
 * prismic.config.json (written by `npx prismic init`). This keeps the tool
 * generic: point it at any repo by changing one env var.
 *
 * This module is Node-only (used by the analysis script). The browser page
 * gets the repository name from the generated artifact instead.
 */
import fs from "fs";
import path from "path";

export function getRepositoryName(): string {
  if (process.env.PRISMIC_REPO) return process.env.PRISMIC_REPO.trim();
  try {
    const configPath = path.join(process.cwd(), "prismic.config.json");
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (parsed?.repositoryName) return String(parsed.repositoryName);
  } catch {
    // no config file yet — fall through to the error below
  }
  throw new Error(
    "No Prismic repository configured. Set PRISMIC_REPO in your environment " +
      "or add `repositoryName` to prismic.config.json (run `npx prismic init`)."
  );
}

export function getReadToken(): string | undefined {
  const token = process.env.PRISMIC_READ_TOKEN;
  return token && token.trim().length > 0 ? token.trim() : undefined;
}

/** Base URL of the Prismic editor for a repository (used for deep-links). */
export function getEditorBaseUrl(repositoryName: string): string {
  return `https://${repositoryName}.prismic.io`;
}
