import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { templates, renderEmail, getTemplatePatch, escapeHtml, projectRef } from "./auth-email-templates.mjs";

const directory = new URL("../emails/auth/", import.meta.url);
const previewData = JSON.stringify(templates.map((template) => ({
  ...template,
  html: renderEmail(template),
}))).replaceAll("<", "\\u003c");

const preview = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SPLIT account email previews</title>
  <style>
    * { box-sizing:border-box; letter-spacing:0; }
    body { margin:0; background:#f4f6f8; color:#0c2642; font:14px/1.5 Arial,Helvetica,sans-serif; }
    header { background:#fff; border-bottom:1px solid #dce2ea; padding:16px 24px 0; }
    .top { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
    h1 { font-size:18px; margin:0; }
    .top a { font-size:13px; color:#5a6c84; }
    [role=tablist] { display:flex; gap:24px; margin-top:16px; overflow:auto; }
    button { font:inherit; cursor:pointer; color:inherit; }
    [role=tab] { white-space:nowrap; padding:12px 0; border:0; border-bottom:3px solid transparent; background:transparent; color:#5a6c84; }
    [role=tab][aria-selected=true] { color:#0c2642; border-bottom-color:#f8a50e; font-weight:700; }
    .subject { padding:16px 24px; display:flex; align-items:center; gap:12px; background:#fff; border-bottom:1px solid #dce2ea; flex-wrap:wrap; }
    .subject p { flex:1 1 220px; margin:0; }
    #copy { border:1px solid #dce2ea; border-radius:6px; padding:8px 14px; background:#fff; }
    #copy:hover { background:#f4f6f8; }
    button:focus-visible, a:focus-visible { outline:2px solid #0c2642; outline-offset:3px; }
    #feedback { font-size:13px; color:#5a6c84; min-height:20px; }
    iframe { display:block; width:100%; border:0; min-height:780px; }
    @media(max-width:600px) { header { padding:16px 16px 0; } .subject { padding:12px 16px; } [role=tablist] { gap:20px; } }
  </style>
</head>
<body>
  <header>
    <div class="top"><h1>SPLIT / Account emails</h1><a href="https://supabase.com/dashboard/project/${projectRef}/auth/templates" target="_blank" rel="noreferrer">Supabase templates</a></div>
    <nav role="tablist" aria-label="Email templates">${templates.map((t, i) => `<button id="tab-${t.id}" role="tab" aria-selected="${i === 0}" aria-controls="email-preview" tabindex="${i === 0 ? 0 : -1}" data-index="${i}">${escapeHtml(t.label)}</button>`).join("")}</nav>
  </header>
  <div class="subject"><p><span style="color:#5a6c84">Subject:</span> <strong id="subject"></strong></p><button id="copy" type="button">Copy HTML</button><span id="feedback" role="status"></span></div>
  <main id="email-preview" role="tabpanel" aria-labelledby="tab-confirmation"><iframe id="email" title="Signup confirmation email preview" sandbox="allow-same-origin"></iframe></main>
  <script id="templates" type="application/json">${previewData}</script>
  <script>
    const templates = JSON.parse(document.getElementById('templates').textContent);
    const tabs = [...document.querySelectorAll('[role=tab]')];
    const frame = document.getElementById('email');
    let active = 0;
    function show(index) {
      active = index;
      tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
      const template = templates[index];
      document.getElementById('subject').textContent = template.subject;
      document.getElementById('feedback').textContent = '';
      document.getElementById('email-preview').setAttribute('aria-labelledby', tabs[index].id);
      frame.title = template.label + ' email preview';
      frame.srcdoc = template.html.replaceAll('{{ .ConfirmationURL }}', '#preview-only').replaceAll('{{ .NewEmail }}', 'your-new-email@example.com');
    }
    frame.addEventListener('load', () => {
      frame.contentDocument.addEventListener('click', (event) => {
        if (event.target.closest('a')) { event.preventDefault(); document.getElementById('feedback').textContent = 'Preview only. No email or account action was triggered.'; }
      });
      frame.style.height = Math.max(780, frame.contentDocument.documentElement.scrollHeight) + 'px';
    });
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => show(index));
      tab.addEventListener('keydown', (event) => {
        const target = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
        if (target !== null) { event.preventDefault(); show(target); tabs[target].focus(); }
      });
    });
    document.getElementById('copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(templates[active].html); document.getElementById('feedback').textContent = 'HTML copied, including the secure Supabase link.'; }
      catch { document.getElementById('feedback').textContent = 'Clipboard unavailable. Use the matching HTML file in emails/auth.'; }
    });
    show(0);
  </script>
</body>
</html>
`;

const files = new Map(templates.map((t) => [`${t.id}.html`, renderEmail(t)]));
files.set("preview.html", preview);
files.set("templates.json", `${JSON.stringify(getTemplatePatch(), null, 2)}\n`);

if (!process.argv.includes("--check")) await mkdir(directory, { recursive: true });
for (const [name, contents] of files) {
  const target = new URL(name, directory);
  if (process.argv.includes("--check")) {
    if (await readFile(target, "utf8") !== contents) throw new Error(`${name} is stale. Run node scripts/build-auth-emails.mjs.`);
  } else {
    await writeFile(target, contents);
  }
}
console.log(`${process.argv.includes("--check") ? "Verified" : "Built"} ${templates.length} Auth email templates in ${fileURLToPath(directory)}`);
