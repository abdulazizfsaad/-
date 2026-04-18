const { execFileSync } = require("node:child_process");

execFileSync("npx", ["tsc", "prisma/seed.ts", "lib/prisma.ts", "--module", "commonjs", "--target", "ES2020", "--moduleResolution", "node", "--esModuleInterop", "--outDir", ".tmp-seed", "--skipLibCheck"], { stdio: "inherit", shell: true });
execFileSync("node", [".tmp-seed/prisma/seed.js"], { stdio: "inherit", shell: true });
