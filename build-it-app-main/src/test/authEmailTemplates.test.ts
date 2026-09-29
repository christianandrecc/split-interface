import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { getTemplatePatch, templates, renderEmail, logoUrl } from "../../scripts/auth-email-templates.mjs";
import { publishTemplates, validatePatch } from "../../scripts/publish-auth-emails.mjs";

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

describe("SPLIT Auth email branding", () => {
  it("keeps generated templates, preview and publication payload in sync", () => {
    expect(() => execFileSync(process.execPath, ["scripts/build-auth-emails.mjs", "--check"])).not.toThrow();
    expect(JSON.parse(readFileSync("emails/auth/templates.json", "utf8"))).toEqual(getTemplatePatch());
  });

  for (const template of templates) {
    it(`${template.id}: preserves both secure action links and only supported variables`, () => {
      const html = renderEmail(template);
      const doc = parse(html);
      const actions = [...doc.querySelectorAll<HTMLAnchorElement>("a[data-auth-action]")];
      expect(actions).toHaveLength(2);
      actions.forEach((link) => expect(link.getAttribute("href")).toBe("{{ .ConfirmationURL }}"));
      expect(actions[0].textContent).toBe(template.action);
      expect(html.match(/{{[^}]+}}/g)).toEqual(template.id === "email_change"
        ? ["{{ .NewEmail }}", "{{ .ConfirmationURL }}", "{{ .ConfirmationURL }}"]
        : ["{{ .ConfirmationURL }}", "{{ .ConfirmationURL }}"]);
      expect(doc.querySelectorAll("script,form,input,iframe,svg,link")).toHaveLength(0);
    });

    it(`${template.id}: uses the published elephant, readable text and email-safe layout`, () => {
      const html = renderEmail(template);
      const doc = parse(html);
      expect(doc.documentElement.lang).toBe("en");
      expect(doc.querySelectorAll("h1")).toHaveLength(1);
      const img = doc.querySelector("img")!;
      expect(img.getAttribute("src")).toBe(logoUrl);
      expect(img.getAttribute("alt")).toBeTruthy();
      expect(img.getAttribute("width")).toBe("44");
      expect(img.getAttribute("height")).toBe("44");
      doc.querySelectorAll("table").forEach((table) => expect(table.getAttribute("role")).toBe("presentation"));
      doc.querySelectorAll("a").forEach((link) => expect(link.getAttribute("href")).toMatch(/^(https:\/\/www\.mysplit\.co\/|mailto:xtiancarrera@gmail\.com|{{ \.ConfirmationURL }})$/));
      expect(html).toContain("<!--[if mso]>");
      expect(Buffer.byteLength(html)).toBeLessThan(20000);
      expect(html).not.toMatch(/support@mysplit|localhost|tracking|fonts\.google/i);
      expect(doc.body.textContent).toContain("SPLIT");
    });
  }

  it("explains two-inbox confirmation without leaking the user's previous email", () => {
    const email = renderEmail(templates.find((t) => t.id === "email_change")!);
    expect(email).toContain("both your current and new email inboxes");
    expect(email).not.toContain("{{ .Email }}");
    expect(email).not.toMatch(/24 hours|60 minutes/);
  });

  it("keeps preview copies exact while disabling real Auth actions in the preview", () => {
    const doc = parse(readFileSync("emails/auth/preview.html", "utf8"));
    const data = JSON.parse(doc.querySelector("#templates")!.textContent!);
    expect(data.map((t: { html: string }) => t.html)).toEqual(templates.map(renderEmail));
    expect(doc.querySelector("iframe")!.getAttribute("sandbox")).toBe("allow-same-origin");
    expect(doc.documentElement.textContent).toContain("#preview-only");
  });
});

const liveConfig = () => ({
  ...Object.fromEntries(Object.keys(getTemplatePatch()).map((key) => [key, "Previous template"])),
  mailer_autoconfirm: false,
  mailer_secure_email_change_enabled: true,
  smtp_pass: "private-smtp-value",
  smtp_host: "smtp.resend.com",
  smtp_sender_name: "SPLIT",
  site_url: "https://www.mysplit.co/",
});

function mockApi(initial = liveConfig(), overrideAfter = {}) {
  let config = initial;
  const calls: { method: string; body?: Record<string, string> }[] = [];
  const fetchImpl = vi.fn(async (url: string, options: RequestInit) => {
    expect(url).toBe("https://api.supabase.com/v1/projects/hpwquupkqssqqgqtwdyu/config/auth");
    expect(options.redirect).toBe("error");
    const body = options.body ? JSON.parse(options.body as string) : undefined;
    calls.push({ method: options.method!, body });
    if (body) config = { ...config, ...body, ...overrideAfter };
    return { ok: true, json: async () => ({ ...config }) };
  });
  return { fetchImpl, calls };
}

describe("Auth template publication safety", () => {
  it("permits exactly six template fields, never SMTP or auth-security writes", () => {
    expect(Object.keys(getTemplatePatch())).toHaveLength(6);
    expect(() => validatePatch({ ...getTemplatePatch(), smtp_pass: "secret" })).toThrow("Only the three");
    expect(() => validatePatch({ mailer_autoconfirm: true })).toThrow("Only the three");
    expect(() => validatePatch({ ...getTemplatePatch(), mailer_subjects_confirmation: null })).toThrow();
  });

  it("fails before any request without a token", async () => {
    const api = mockApi();
    await expect(publishTemplates({ token: "", ...api })).rejects.toThrow("token is missing");
    expect(api.fetchImpl).not.toHaveBeenCalled();
  });

  it("defaults to a read-only check", async () => {
    const api = mockApi();
    const result = await publishTemplates({ token: "test-only", ...api });
    expect(result.status).toBe("ready");
    expect(api.calls).toEqual([{ method: "GET", body: undefined }]);
    expect(JSON.stringify(result)).not.toContain("private-smtp-value");
  });

  it("backs up only templates before writing and verifies the saved configuration", async () => {
    const api = mockApi();
    const saveBackup = vi.fn(async (backup) => {
      expect(api.calls).toHaveLength(1);
      expect(Object.keys(backup.templates)).toEqual(Object.keys(getTemplatePatch()).sort());
      expect(JSON.stringify(backup)).not.toContain("private-smtp-value");
    });
    const result = await publishTemplates({ token: "test-only", apply: true, ...api, saveBackup });
    expect(saveBackup).toHaveBeenCalledOnce();
    expect(api.calls.map((call) => call.method)).toEqual(["GET", "PATCH", "GET"]);
    expect(api.calls[1].body).toEqual(getTemplatePatch());
    expect(result.status).toBe("published-and-verified");
  });

  it("does not send a PATCH if the backup fails", async () => {
    const api = mockApi();
    await expect(publishTemplates({ token: "test-only", apply: true, ...api, saveBackup: async () => { throw new Error("Disk full"); } })).rejects.toThrow("Disk full");
    expect(api.calls.map((call) => call.method)).toEqual(["GET"]);
  });

  it.each([
    { mailer_autoconfirm: true },
    { mailer_secure_email_change_enabled: false },
    { hook_send_email_enabled: true },
  ])("stops if the hosted Auth flow differs from the reviewed flow: %o", async (overrides) => {
    const api = mockApi({ ...liveConfig(), ...overrides });
    await expect(publishTemplates({ token: "test-only", apply: true, ...api, saveBackup: vi.fn() })).rejects.toThrow();
    expect(api.calls.map((call) => call.method)).toEqual(["GET"]);
  });

  it("avoids writes when the desired templates are already saved", async () => {
    const api = mockApi({ ...liveConfig(), ...getTemplatePatch() });
    expect((await publishTemplates({ token: "test-only", apply: true, ...api })).status).toBe("already-current");
    expect(api.calls).toHaveLength(1);
  });

  it("does not claim success when the server did not save the template", async () => {
    const api = mockApi(liveConfig(), { mailer_subjects_confirmation: "Not saved" });
    await expect(publishTemplates({ token: "test-only", apply: true, ...api, saveBackup: vi.fn() })).rejects.toThrow("did not return all saved templates");
  });

  it("detects concurrent SMTP changes without printing their values", async () => {
    const api = mockApi(liveConfig(), { smtp_pass: "changed-secret" });
    await expect(publishTemplates({ token: "test-only", apply: true, ...api, saveBackup: vi.fn() })).rejects.toThrow("Auth/SMTP settings changed");
  });

  it("does not log or parse sensitive error response bodies", async () => {
    const json = vi.fn();
    await expect(publishTemplates({ token: "test-only", fetchImpl: async () => ({ ok: false, status: 403, json }) })).rejects.toThrow("HTTP 403");
    expect(json).not.toHaveBeenCalled();
  });
});
