import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { expect, it } from "vitest";

it("loads the compiled Vercel function without a TypeScript-aware module resolver", () => {
  const directory = mkdtempSync(join(tmpdir(), "split-apple-deployment-"));
  try {
    writeFileSync(join(directory, "package.json"), JSON.stringify({ type: "module" }));
    symlinkSync(resolve("node_modules"), join(directory, "node_modules"), "dir");
    // Vercel emits JavaScript; Vitest's resolver can mask stale .ts imports.
    for (const source of ["api/apple-music.ts", "server/appleMusic.ts", "src/lib/appleMusicCatalog.ts"]) {
      const destination = join(directory, source.replace(/\.ts$/, ".js"));
      mkdirSync(dirname(destination), { recursive: true });
      const output = ts.transpileModule(readFileSync(source, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        fileName: source,
      });
      writeFileSync(destination, output.outputText);
    }
    const entry = pathToFileURL(join(directory, "api/apple-music.js")).href;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", `
      const {default: handler} = await import(${JSON.stringify(entry)});
      const availability = await handler.fetch(new Request("https://www.mysplit.co/api/apple-music"));
      const search = await handler.fetch(new Request("https://www.mysplit.co/api/apple-music?q=test"));
      console.log(JSON.stringify({status: availability.status, body: await availability.json(), searchStatus: search.status}));
    `], { encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 10000 });
    expect(JSON.parse(output)).toEqual({ status: 200, body: { available: false }, searchStatus: 401 });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
