import { loadEnv } from "vite";
import { validateDeploymentEnv } from "./deployment-env.mjs";

const issues = validateDeploymentEnv(
  loadEnv("production", process.cwd(), "VITE_"),
);
if (issues.length) {
  console.error(
    "Deployment configuration needs attention:\n" +
      issues.map((issue) => `- ${issue}`).join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log(
    "Deployment environment passed: Supabase URL, public key, and optional redirect/project settings.",
  );
}
