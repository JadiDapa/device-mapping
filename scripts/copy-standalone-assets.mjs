// Next's standalone output omits static assets and public/. Copy them in so
// `node .next/standalone/server.js` serves a complete app.
import { cp, access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(standalone))) {
  console.error(
    "Missing .next/standalone. Run `next build` with output: 'standalone' first.",
  );
  process.exit(1);
}

const copies = [
  [
    path.join(root, ".next", "static"),
    path.join(standalone, ".next", "static"),
  ],
  [path.join(root, "public"), path.join(standalone, "public")],
];

for (const [from, to] of copies) {
  if (await exists(from)) {
    await cp(from, to, { recursive: true });
    console.log(
      `copied ${path.relative(root, from)} -> ${path.relative(root, to)}`,
    );
  }
}
