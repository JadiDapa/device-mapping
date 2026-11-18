// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PRD-M8 §6.4: no hardcoded colours outside the token file and
 * src/lib/status.ts. Colours must come from CSS variables / Tailwind tokens.
 */

const SRC = join(process.cwd(), "src");

/** Files allowed to contain colour literals, with the reason. */
const ALLOWLIST = new Set<string>([
  "src/app/globals.css", // token source of truth
  // Browser-chrome <meta name="theme-color"> cannot use CSS variables.
  "src/app/layout.tsx",
]);

/**
 * Files that still contain literals and are not yet migrated.
 * TODO(M8): remove each entry as its owner migrates it to tokens.
 */
const KNOWN_OFFENDERS = new Set<string>([]);

const HEX =
  /(?<![\w&/#-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;
const FUNC = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|css)$/.test(name)) out.push(full);
  }
  return out;
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

export function findColorLiterals(src: string): string[] {
  const hits: string[] = [];
  for (const line of stripComments(src).split("\n")) {
    const m = HEX.exec(line) ?? FUNC.exec(line);
    if (m) hits.push(line.trim());
  }
  return hits;
}

describe("no hardcoded colours", () => {
  it("detects literals (sanity)", () => {
    expect(findColorLiterals('const a = "#fff";')).toHaveLength(1);
    expect(findColorLiterals("color: rgb(0 0 0 / 0.5);")).toHaveLength(1);
    expect(findColorLiterals('href="/a#section"')).toHaveLength(0);
    expect(findColorLiterals("// #ffffff in a comment")).toHaveLength(0);
  });

  it("keeps colour literals out of src (except allowlisted files)", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(process.cwd(), file).split(sep).join("/");
      if (ALLOWLIST.has(rel) || KNOWN_OFFENDERS.has(rel)) continue;
      if (/\.test\.tsx?$/.test(rel)) continue;
      const hits = findColorLiterals(readFileSync(file, "utf8"));
      if (hits.length) offenders.push(`${rel}: ${hits[0]}`);
    }
    expect(offenders).toEqual([]);
  });
});
