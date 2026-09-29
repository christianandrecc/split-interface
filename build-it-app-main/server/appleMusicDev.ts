import type { Plugin } from "vite";
import { createAppleMusicHandler } from "./appleMusic.ts";

export function appleMusicDev(env: Record<string, string>): Plugin {
  const handle = createAppleMusicHandler({ env });
  return {
    name: "split-apple-music", apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (url.pathname !== "/api/apple-music") return next();
        const headers = new Headers();
        if (typeof req.headers.authorization === "string") headers.set("authorization", req.headers.authorization);
        const result = await handle(new Request(url, { method: req.method, headers }));
        res.statusCode = result.status;
        result.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await result.text());
      });
    },
  };
}
