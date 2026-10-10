# SPLIT decisions

| ID / date | Decision and reasoning | Authority / state |
| --- | --- | --- |
| D-01 / 2026-10-10 | Preserve React/Vite, SwiftUI and one authoritative Supabase business contract. Keep web and `ios/` directories; no monorepo rewrite. Existing implementation is substantial. | Current architecture verified; major changes require founder approval |
| D-02 / 2026-10-10 | Reuse the current clean management checkout; branch `management/split-gm` matches the requested name. Preserve web `main` and native `codex/ios-development`. | Executed local Git setup |
| D-03 / 2026-10-10 | Three persistent workstreams: GM here, existing web chat, existing native chat. Use bounded specialists; no extra permanent chats. | Established ownership; handoff receipt tracked in AGENT_TASKS |
| D-04 / 2026-10-10 | Central root documents carry current coordination state; old release notes remain dated evidence. Integrate by PR; use `git show management/split-gm:<file>` before merge. | Prepared; main integration/release not authorized |
| D-05 / 2026-10-10 | Only fixture/local disposable tests now; read-only cloud metadata allowed. Hosted backend has real invitation delivery enabled and no separate staging. | Enforced for initial audit |
| D-06 / 2026-10-10 | Source implementation, local tests, hosted metadata, live workflow validation, and release approval remain distinct. | Adopted verification rule |
| D-07 / historical, rechecked 2026-10-10 | SMS verification deliberately paused; hosted `required=false`, web switch defaults off. Collected phone is not verified identity; invitations use email/@username. | Existing founder decision preserved; no activation |
| D-08 / historical, rechecked 2026-10-10 | Publishing/admin setup, automated PRO/MLC submission, signature/reminder emails and automatic PDF delivery remain outside verified beta functionality. Elephant currently offers deterministic help. | Existing implementation/scope; real AI requires later decision |
| D-09 / historical, rechecked 2026-10-10 | Account closure is manual review with signed-record deletion guard; formal retention/revocation/support operation remains open. Backups were deferred by founder; dated local proof is not current recovery readiness. | Preserve decision; bring current recovery gap back for review |
| D-10 / 2026-10-10 | Execute the web-beta milestone while native lifecycle develops separately. | Founder directed delegated work "for web beta launch"; no release/distribution approval implied |
| D-11 / pending | Choose isolated hosted integration target with outbound jobs/provider budgets disabled until controlled activation. | GM-01 prepares exact plan/cost; no cloud creation approved |
| D-12 / 2026-10-10 | Repair dependency gate conservatively; do not blindly run force audit upgrades or replace Tailwind. | GM-02 implementation delegated and active; independent review required, production unchanged |
| D-13 / 2026-10-10 | Start GM-02/03, then GM-05 with the existing web agent. Run bounded backend isolation/recovery, independent QA and operations preparation in parallel with separate ownership. | Founder authorized delegation/start; delivery and exact checkouts verified in AGENT_TASKS |

Use new dated entries for consequential changes. Do not reinterpret an old approved release as continuing authorization to deploy, change data, spend money, or publish legal commitments.
