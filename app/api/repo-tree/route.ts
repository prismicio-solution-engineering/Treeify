// app/api/repo-tree/route.ts
//
// Mirrors Slicify's /api/slices route:
//   GET  → return the current snapshot (running the analysis first if missing)
//   POST → re-run the analysis, then return the fresh snapshot
//
// The analysis is a standalone script (scripts/buildRepoTree.ts) executed on
// demand, exactly like Slicify runs its slice-index scripts.
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const ARTIFACT = path.join(process.cwd(), "artifacts/repoTree.json");

export const dynamic = "force-dynamic";

async function runAnalysis() {
  console.log("🌳 Running repo-tree analysis…");
  const { stdout, stderr } = await execAsync(
    "npx tsx scripts/buildRepoTree.ts",
    { cwd: process.cwd(), env: process.env, maxBuffer: 1024 * 1024 * 32 }
  );
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
}

async function readArtifact() {
  const raw = await fs.readFile(ARTIFACT, "utf-8");
  return JSON.parse(raw);
}

export async function GET() {
  try {
    const exists = await fs
      .access(ARTIFACT)
      .then(() => true)
      .catch(() => false);
    if (!exists) await runAnalysis();
    return NextResponse.json(await readArtifact());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Failed to load repo tree: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await runAnalysis();
    return NextResponse.json(await readArtifact());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Failed to refresh repo tree: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}
