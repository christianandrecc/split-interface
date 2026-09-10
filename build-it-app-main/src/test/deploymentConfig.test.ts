import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateDeploymentEnv } from "../../scripts/deployment-env.mjs";

const valid = {
  VITE_SUPABASE_URL: "https://testproject.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-key",
};
const jwt = (payload: object) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;

describe("deployment configuration", () => {
  it("accepts public credentials and defaults the redirect to the app origin", () => {
    expect(validateDeploymentEnv(valid)).toEqual([]);
  });

  it("rejects a build with missing configuration", () => {
    expect(validateDeploymentEnv({})).toHaveLength(2);
  });

  it("accepts a matching legacy anon key", () => {
    expect(
      validateDeploymentEnv({
        ...valid,
        VITE_SUPABASE_PUBLISHABLE_KEY: jwt({
          role: "anon",
          ref: "testproject",
        }),
      }),
    ).toEqual([]);
  });

  it("rejects mismatched project refs and legacy keys", () => {
    expect(
      validateDeploymentEnv({
        ...valid,
        VITE_SUPABASE_PROJECT_ID: "different",
      }),
    ).toHaveLength(1);
    expect(
      validateDeploymentEnv({
        ...valid,
        VITE_SUPABASE_PUBLISHABLE_KEY: jwt({ role: "anon", ref: "different" }),
      }),
    ).toHaveLength(1);
  });

  it.each(["sb_secret_test-value", jwt({ role: "service_role" })])(
    "rejects privileged browser credentials without printing them",
    (key) => {
      const issues = validateDeploymentEnv({
        ...valid,
        VITE_SUPABASE_PUBLISHABLE_KEY: key,
      });
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.join(" ")).not.toContain(key);
    },
  );

  it("checks other exposed variables for secrets", () => {
    expect(
      validateDeploymentEnv({
        ...valid,
        VITE_SERVICE_ROLE_KEY: "do-not-print-me",
      }),
    ).toHaveLength(1);
  });

  it.each([
    "http://example.com",
    "https://user:password@example.com",
    "https://example.com/?token=test",
    "https://example.com/#recovery",
  ])("rejects unsafe deployed redirects: %s", (redirect) => {
    expect(
      validateDeploymentEnv({
        ...valid,
        VITE_SUPABASE_AUTH_REDIRECT_URL: redirect,
      }),
    ).toHaveLength(1);
  });

  it("accepts a deployed HTTPS redirect origin", () => {
    expect(
      validateDeploymentEnv({
        ...valid,
        VITE_SUPABASE_AUTH_REDIRECT_URL: "https://split.example.com/",
      }),
    ).toEqual([]);
  });

  it("uses a clean install, configuration/type gates, and SPA rewrites on Vercel", () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
    );
    expect(config.installCommand).toBe("npm ci");
    expect(config.buildCommand).toBe("npm run verify:deploy");
    const scripts = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")).scripts;
    expect(scripts["verify:deploy"]).toContain("npm run check:deploy");
    expect(scripts["verify:deploy"]).toContain("npm run verify:database");
    expect(scripts["verify:beta"]).toContain("npm run typecheck");
    expect(config.outputDirectory).toBe("dist");
    expect(config.rewrites).toContainEqual({
      source: "/(.*)",
      destination: "/index.html",
    });
  });
});
