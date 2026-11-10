# Archived independent actual-app CSP option review — November 3, 2026

GM read the complete final report and verified report/ledger plus all 116 referenced artifact hashes. Temporary links are converted to filenames; original binaries remain outside Git. The report qualifies a precise local maintenance option and corrected replay archive; a separately authorized assembled implementation still requires exact-candidate QA.

- Original `QA_REPORT_ZOD_CSP_APP_OPTIONS_2026-11-03.md`: `678d887a136cd2d45fa6b0fbb12449106e85eaa2d2ce432dfec547468b19e4be`
- Original `verification_ZOD_CSP_APP_OPTIONS_2026-11-03.json`: `3fcb3fb71cfcd242aca2b3ccb625ae65a6e10f03774d94d1f767927a016a25cf`

---

# Independent actual-app CSP option and archive review

**READY_FOR_GM_SELECTION_AS_BOUNDED_LOCAL_DEPENDENCY_MAINTENANCE_WITH_GATES.** The exact disposable four-file configured-Zod proposal prevents the measured blocked-eval probe across every current application schema entry path tested, while preserving current schema definitions, raw outputs/errors within Zod4, normalization and API behavior. It fits the existing React/Vite/server architecture. GM can now select a concrete local implementation scope; this report does not select/apply an app major, source patch, branch combination, input policy or deployment.

**C1/C2 close within this proposed variant's local scope. E1 closes in corrected package-v2 only.** The original two-pin control still emits its caught CSP event, and the original109-file archive remains the incomplete historical checkpoint. No older report is retroactively passed.

## Exact reviewed identity

Base7ea23599d2b69adb33f2bc7a3299342f95386a51 + exact Zod4.6.6/resolver7.0.2 pair, lock SHA-256 `c427b3f098e3c8780b4514f01f2c3f8bb89788b889a48096f72a57acfc1d3c12`; no code commit for this disposable proposal. Source patch SHA-256 `dcf1059f76ec2bd9e5578c65f860cba94b5cd390cc2bbd00583c70b8c91b699f`; original candidate401-file manifest `31595f124ba87949782039a295381412344d0a8dde80e5960d2565a4899935c2`, control400-file manifest `8aa40b42ba8a5107c90110aaab70c6166a5f03e7bdd6a202b56b94ab50dad19f`. Exact docs-only b32dc7f document and external CSP_APP_OPTION packet were read; docs/source scope is separate.

The CSP archive independently verifies all149 indexed size/hash entries: bundle `906004227a92b6e661a750008f8b7b1f14b1c648d2a71fe18b31446fbb0687a1`, index `2a50a0e8a3d2c2310631ef1067980fa1e4f8b80c51211c8d8dbcc96f1a4616b5`. Fresh control/candidate were reconstructed using **only archived** source tar, four package/lock files and four proposed full source files; both complete manifests match. No external repair, lock regeneration or owner checkout was used. Package pair/lock are byte-identical between variants.

## Four-file source and ordering review

- New src/lib/configuredZod.ts imports public z, calls `z.config({jitless:true})`, then re-exports z.
- The two actual schema modules change **only** their first import to `./configuredZod.js`. Definitions, defaults, error handling and all other bytes are unchanged.
- Existing API deployment test additionally emits the helper and asserts zero Function-constructor attempts through API import/availability/search. No lint/test/dependency gate is weakened.

All other397 existing tracked files match. Source scan over src/server/api finds the helper as the **only direct application Zod import**; both current schema modules depend on it. The helper has no reverse import/cycle. ESM dependency evaluation runs it before schema module bodies. Browser SampleTrackSearch→search/catalog, API→server→catalog, Vite-dev adapter→server→catalog and direct catalog imports all take this path. There is no main.tsx-only setup, inline/private global assignment, unsafe-eval permission, CSP/header change, React/RHF major or new backend/service.

Fresh installed primary Zod source hashes match indexed package-evidence copies. Its object constructor captures jitless before consulting allowsEval; util's capability probe attempts/catches Function construction when allowed. Setting config before construction is necessary; the source wrapper makes that dependency explicit. Configuration is per realm and disables the JIT fast path even on the server. Future schemas/workers/third-party eager construction must preserve ordering; no cross-worker guarantee or throughput guarantee is claimed.

The `.js` source specifier is deliberate: full TypeScript/Vite builds resolve source TS, and freshly emitted **unbundled API ESM** resolves configuredZod.js with plain Node under disallow-code-generation, without a TS-aware resolver. The unchanged architecture is preserved.

## Fresh independent execution

Capacity was checked after recovery (about5.12GiB available). Fresh exports/installs only, Node24.22.1/macOS arm64; minimal app environment and source/env verification precede config imports. No old export was reinstalled and no further cleanup occurred. Latest measured free space is about3.93GiB; shared system activity can change it.

| Check | Fresh independent result |
| --- | --- |
| Exact-lock ci/tree | PASS both variants; source manifests unchanged afterward. No regeneration. |
| Candidate unchanged verify:beta | **PASS869 tests/81 files**, typecheck, original lint and production build. Seven existing Fast Refresh warnings retained. Ran once, before creating ignored probe helpers; no duplicate baseline869 run. |
| Control build | PASS, with unchanged package/lock and current source. |
| Strict resolver/RHF declarations | PASS both variants with skipLibCheck=false and typed Input/Context/Output/raw forms. |
| Actual schema cases | PASS46 each, **all raw outcomes/errors and successful outputs identical** within the same Zod4 version. |
| Resolver contracts | PASS14 each; full values/errors/native calls identical, all returned/zero throws. Includes sync/async, invalid/raw/transforms/nested paths and input immutability. |
| Strict-CSP fresh browser pages | **PASS16**: variants×Chrome156.0.8078.80/WebKit26.5×1280/390×mounted fixture/actual compiled app. Control8 blocked-eval events, one/page; proposal0. |
| Actual app sample | Production draft→Sample→Yes→search→normalized selection→remove→malformed response→same generic error. Real SDK with synthetic local placeholder session; intercepted local HTTP only. No harness jitless setter. |
| Mounted form | Invalid submission preserves null output/focuses field, then normalized valid submit; actual SampleTrackSearch success/error. Current shipped source does not gain a resolver form. |
| Browser health/layout | Zero page errors, console warnings/errors, foreign requests or horizontal overflow in all16 pages. Identity/nonblank/interactions and screenshots verified. Strict script-src self policy retained. |
| Entry import controls | **Six isolated source-entry processes**, Node disallow-code-generation: API/dev/catalog control attempts[1,1,1], proposal[0,0,0], including immediately after import. Normalized valid/mixed/late-valid/invalid bodies match. |
| Additional actual entry I/O | **Four independent processes**: two emitted unbundled API and two real dev-middleware loopback HTTP probes. Normalized valid/mixed/late-valid/max8, availability, unauthenticated401, unavailable and not-configured503 match. Proposal0 Function attempts/control1; no TS resolver for emitted API. |

Dedicated Playwright sessions used loopback8301 plus ephemeral loopback middleware ports; Browser plugin not available, so frontend-testing-debugging fallback applied. Owner browser/Simulator/worktree stayed untouched. Browser harness replay used path/port adaptations and a pointer reset for screenshots only. Function instrumentation observes calls; it does not configure Zod or weaken code-generation restrictions. Synthetic fetchers intercept every provider/auth call; ephemeral signing keys stay in memory and are not printed/persisted. Node shim plus browser HTTP/WS restrictions are not a machine-wide browser-background firewall.

All eight paired error screenshots are byte-identical. Six of eight selected pairs are identical; two selected pairs differ solely in the Edit details tooltip rectangles (Chrome390 fixture and WebKit390 production, bounds retained). These are hover-close timing states, not a schema/render/layout regression; both pairs were inspected and retained. Actual candidate mobile error and desktop selected UI are readable without overlap. No universal pixel-equality claim replaces these observations.

Fresh production audit at configured moderate threshold: both0/exit0. Candidate audit 2026-11-03T21:14:08.414Z–2026-11-03T21:14:08.861Z. Full candidate audit still **12moderate package entries/exit1**, 2026-11-03T21:14:08.896Z–2026-11-03T21:14:10.321Z. Actual app manifests remain unchanged, so no actual dependency-gate closure is claimed. No advisory waiver/global minimatch override.

Fresh production assets vs two-pin: **+17 raw/+6 summed per-file Node gzip bytes**, CSS byte-identical. Owner reported+17/+5; this isolated build gives+17/+6. This is a build-size comparison, not a network or performance benchmark. The earlier pair's roughly35KB raw/13KB gzip increase from Zod3 remains a separate baseline cost.

## Corrected archive E1 closure

New package-v2 bundle `dc35ed1fd8151e872d0e0e732ddab360417be864393926fe234eebf895facd2a`, index `a529ecc38af7dbdd8f25135005f7b0ed517f5be4af0ce2111207c3b6b3e6cb39`: all120 indexed files independently verified. **All six original manifest/lock files are genuinely present**, match indexed original variant manifests and reconstruct three complete400-file variants using archive contents alone. Its candidate source/lock match the fresh CSP two-pin control exactly.

Bounded standalone replay ran on the corrected archive's reconstructed candidate:46 schema cases,14 resolver contracts and strict declarations pass and match fresh two-pin results. It reused this review's fresh ci dependency tree via an explicit local symlink because the lock is byte-identical; no third reinstall or old export resurrection, no external source/manifest repair. This closes packaging completeness/replay without duplicating all three installs or869 tests. The archive still requires the recorded runtime and normal npm package availability; it is not an offline registry.

Original109 archive/index/packet independently rehash to their original values (`232ed1b9…`, `5194b691…`, `237c6181…`) and remain untouched, alongside the failed old replay report. E1 is closed **only by the separate versioned120-file replacement**. No original standalone-replay claim is retroactively validated.

## Disposition and remaining decisions

C1/C2: locally resolved for this actual-app source option, beyond the earlier isolated parse experiment. E1: closed in verified v2. No additional consequential architecture/API/schema/default/input-policy change is needed by the inspected proposal, and its functional maintenance scope is reviewable now. **Ready for GM selection of a bounded local candidate**, with existing authority/approval boundaries preserved. Implementation must retain exact package/source identity and receive its own combined-candidate evidence if other accepted changes are assembled. No selection, application-major/bootstrap change or focus/tooling combination was performed here.

Zod3→4 raw error APIs/messages still differ as previously measured; this wrapper adds no further raw error change within Zod4. Disabling JIT may change non-CSP/server throughput and resource use; bounded synthetic timings are not a performance qualification. Body buffering/unbounded upstream collections, late-valid-record behavior and explicit byte/collection policy remain separate; no caps or resolver removal chosen.

Linux, exact Safari16.4/Chrome111/Firefox128 runtimes, real Safari/devices, hosted provider/authentication, full integration/UI, legal/operating and release gates stay open. Syntax targets are not polyfills for existing AbortSignal.any/timeout. Base7ea2359 lacks separately accepted325f64d focus correction; no combined candidate or main release exists. Existing large chunks, act/expected ErrorBoundary warnings and prior PostCSS warning history remain recorded, not suppressed. No app/source/branch/lock changes, schema/RPC mutation, hosted Supabase/DocuSign/demo/OAuth/email/upload/tunnel, real credentials/configuration, spending, push/main merge, deployment/distribution or legal action occurred. All dedicated review processes closed; stop after this report.

Owner869/16pages/6server and archive replay reports are preserved as **developer readback**, separate from this review's fresh869 once/16pages/10 dedicated entry processes plus46+14 cases per source variant and corrected-archive bounded replay. Owner historical ENOSPC/lint-helper/prelaunch attempts remain in ATTEMPTS.md; they are not counted as passing runs. This review's runtime checks required no retry or product assertion waiver.

Evidence: verification_ZOD_CSP_APP_OPTIONS_2026-11-03.json (`verification_ZOD_CSP_APP_OPTIONS_2026-11-03.json`), source-review.json (`source-review.json`), entry-io-results.json (`entry-io-results.json`), E1 standalone replay (`e1-standalone-replay.json`).

## Screenshots

Screenshot artifact: `jitless-app-chrome-390-production-app-error.png` (digest below).

Screenshot artifact: `jitless-app-webkit-1280-production-app-selected.png` (digest below).


## GM-verified artifact digests

| Artifact | SHA-256 |
| --- | --- |
| `FINALIZATION_NOTES.md` | `c144949d88926fc097cf182b8233f10e5362eb65c3440903f5f9dd668f799d88` |
| `browser-csp-results.json` | `334531c4867fe0424b78e813d290750872b67b0b4c1565625695c388f7566d64` |
| `browser-csp.log` | `c263de67124673dd686f9e4c8c9c7dc56d6ec25def039f52fb637c50cc976fcc` |
| `browser-csp.mjs` | `b2ad2472d8a5e23c901f7995a4a2f8900f502ca6d4d33f3305664d9a90df677b` |
| `developer-readback.json` | `05196d6e570d572603568db59df588a0fbf1c49b7844b2866695d9cc0223ac79` |
| `e1-contract.log` | `f9453f99d4893c967a7f6b9b0778e8237d9b1c93475fb16c5ca383c7b1464406` |
| `e1-runtime.log` | `7ae65bd68c49ce06a1d7b7919d0e88c159f8a48f0faa7f787cf7834b23f29a56` |
| `e1-standalone-replay.json` | `33d732c75d5d510e8ef650e1f48e5d8b1b454f78e2e132a0a0280b664359afeb` |
| `e1-standalone-replay.log` | `435e033232f3d4b50513795e56ecebca0b5b90cb450a0e2f188c9d538a900aea` |
| `e1-standalone-replay.mjs` | `36805b25c1c0326cd5a95cddff764ea0925d0224910c7a7c3e0ade24999237f2` |
| `e1-strict-declarations.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `entry-io-results.json` | `22490d3369821be11566ad674d03c97b7601f721e5f7afcb8fd9db13ac7e27bf` |
| `entry-io.log` | `8a7caba8f03bd92c02f2fb108614824055dd5c3ee6d3c28963ae12ac76b675d3` |
| `entry-io.mjs` | `0a08b29b2f2733ddac4f6fbc4284976f29e659616c0be966601754c07b3bdc9e` |
| `finalize-attempt1.py` | `5d12d5c07307d215ec335ee7e61225872f1743f042b86136912124bf011ff48e` |
| `finalize.py` | `992cf6ceb682b824a1d4f693927b6cdd7f4ea8fd02df1bf815cec043a531b7f0` |
| `jitless-app-api-inputs.json` | `6c1456b18f7b1b9ddf157947e263362e0503394c61abf296e0244fbe961419d1` |
| `jitless-app-api-order.log` | `1fa4eab10600f72b9faefdd4e290732fab4beadf1a6f89bb1438fc1c5090e0e6` |
| `jitless-app-audit-full.json` | `1be3b1de78e8dc7c980c5f0bccb2c068e803b514fc48d7d2ba0cc3ac5d85967a` |
| `jitless-app-audit-full.log` | `b177520675a58cee2cef94eaa0072ba0b1c1a823de56cd37b989b5753acaf8e1` |
| `jitless-app-audit-production.json` | `325a97256100b665eabd48a2b4c68453c827ef0dcd03056c6a0f5f3aa87de897` |
| `jitless-app-audit-production.log` | `c0cd6892d6e56d1d76b921f7a7ba1afb5d423cb58cc03684635fd4ad6ab507d2` |
| `jitless-app-browser-inputs.json` | `0419b1f772137e61ce851074c9df7504d9e0cbd80d9b555aa0effbb1dddc7ffa` |
| `jitless-app-browser.js` | `0959d30574e4a2549d5d5e5403e81ffa627682b605cd5cff9f5b0dd702cc7bbf` |
| `jitless-app-catalog-inputs.json` | `488255208c33f93f75c007b8133657579f55d9051de42b92cec14f9f9b55286a` |
| `jitless-app-catalog-order.log` | `217d41d31a6d4504b435cea29e4f3813b673cea8ae74b651f23254d92204d323` |
| `jitless-app-chrome-1280-fixture-error.png` | `5ace104eda79e23e212e35fd4710885feefd5fa0cc8f10fb8062b0a13926d3de` |
| `jitless-app-chrome-1280-fixture-selected.png` | `0559eb9b52935fc5c10b3ba11b06d3c523571094fd295213a1ea1fb94f9948d6` |
| `jitless-app-chrome-1280-production-app-error.png` | `348d5714586e6a9ce34849ed782a9120fa8f7db6e0f2aeb546313b5ff4f446a9` |
| `jitless-app-chrome-1280-production-app-selected.png` | `ad10922f31a0baa46848b43b6a2bed232756d7d524d5f6340243c5235c55a613` |
| `jitless-app-chrome-390-fixture-error.png` | `10acd69ed148aedd763ae71404dbf16b4fd6bb9093b287434b4614ac42f1a36b` |
| `jitless-app-chrome-390-fixture-selected.png` | `a170fd500377e70f13cced717eb53fba5a6fce78cc284661ba184aceb16d2b3c` |
| `jitless-app-chrome-390-production-app-error.png` | `657ec8578902eeb165222e10c9102f5edac78fafb897990ce26790dec87bebe7` |
| `jitless-app-chrome-390-production-app-selected.png` | `17981629642bc2400a88362f144eec88df5b6ba61f3c4368a7c4b7551541f8a6` |
| `jitless-app-ci.json` | `decdfe7d4425959637ff7751c75600d1dc9ec73a0284a57b56451a02d16eb56e` |
| `jitless-app-ci.log` | `6fc41a98d57450117c205b800ba1651f4617dd4ebb8757aa3fae03b1be79bb4e` |
| `jitless-app-contract.json` | `59632ad29b40213a53a43c30526a0289c10ddd4e4d4d708bccb38785953467b5` |
| `jitless-app-contract.log` | `f9453f99d4893c967a7f6b9b0778e8237d9b1c93475fb16c5ca383c7b1464406` |
| `jitless-app-dev-http.log` | `ff70136a948dee85727a5d347b6e555d47027cf0c1885b3599a8533894639665` |
| `jitless-app-dev-inputs.json` | `5298bc8a4dd460ecd5912029d256f318e67617b69d7ec11c360c8356bfd758fa` |
| `jitless-app-dev-order.log` | `df058816e942a1fdd7b550449bf8cbe18fd4232c22709c1e4065af63c1fc1e10` |
| `jitless-app-emitted-api.log` | `885687e7efecef3dd8eb5ccd83cdeb4ea6ffdd4a43ef92c24f743491d4a75f66` |
| `jitless-app-manifest.json` | `498e3ef889b5c17d341721b055d9f5e81499c7fe7200d29953bdd3eccc6ccefc` |
| `jitless-app-runtime.json` | `c78eb040edea35f4b114f29df263b5c8efd52cafdbf67dc822993271fd0be1e0` |
| `jitless-app-runtime.log` | `b4da956679458dae6ed3ed992b0a0715ed3beb5a15e2167af256e4c021c05b2d` |
| `jitless-app-strict-declarations.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `jitless-app-tree.json` | `8561d3c1874cef8a84f5322c01f80cde3c08f9f844716fb6f4896a6d836e7cd3` |
| `jitless-app-tree.log` | `e75752e9b66b1af4f4d4c643c9adc1027f5705ed042de03d3f3e0245023066fd` |
| `jitless-app-verify-beta.json` | `2327246e620c884759952fe2c15f2360825981551d196a2ec88541444dcdfb1c` |
| `jitless-app-verify-beta.log` | `99e82abdc415ef1f00b017a1d7cb7be668e5189abd2602e090840f6993859c6d` |
| `jitless-app-webkit-1280-fixture-error.png` | `616a296bf6dfc792957287da25d13d842ca1ab398ac749c728d6c88ad34edd9c` |
| `jitless-app-webkit-1280-fixture-selected.png` | `d27b07b5d439e3545e55e0708aef8e83f0325bccc0d273fe148a4e29fecb90a3` |
| `jitless-app-webkit-1280-production-app-error.png` | `1d8d1668b5f428f57698e5ee6ba4bb701913653ab7a2acaaa5e2106722636fde` |
| `jitless-app-webkit-1280-production-app-selected.png` | `56729ee4b0e3d458e7c3d95601d03cb03604d5f6e36e2ff9934bde3c5c3ab9a2` |
| `jitless-app-webkit-390-fixture-error.png` | `e4d2941c488fb523743666d8c9fddf83bc01c5e29c631fd09dba2fe3187989ab` |
| `jitless-app-webkit-390-fixture-selected.png` | `d6f74fc0f9a315cc94cb059569e27ae9568ab7efcb8b7fe5badcde56f163f544` |
| `jitless-app-webkit-390-production-app-error.png` | `71e1dbecbd663c48bcebc09fd1b341a53c898ec958ae63709d63323091737204` |
| `jitless-app-webkit-390-production-app-selected.png` | `36d1a7ae49ef44176300ec7838940bc062fd77e16e53341b0336b73c501f78ff` |
| `network-deny.cjs` | `a3d732d322c2df4feebc566f538095220eda6ccff621024c2b3f8bb7ebf2ec84` |
| `original-109-checkpoint-retention.json` | `aec263714fb4619023ec7ce225bd65bf723915fbd8510e78af549cf7fd3c4357` |
| `owner-package-v2-verification-readback.json` | `62a0d409edbd5df1f52287574c535554d28d4087d55519e38a93c791928ea770` |
| `prepare.py` | `66a545ac19aede11a74f0a42a50d81013cba4045ea1e61d4031716564faf3ee3` |
| `probe-replay.json` | `9fd2d7adffccf7985a2aa437360ce372a918d0bdbb69bb153a1426fb296b8d0c` |
| `production-asset-comparison.json` | `feaefd670fa3c73db545e55b052942981aa44668add7be6762440dcb6a5d9e46` |
| `provenance.json` | `87c3827530d976cc2bc4ef3ea55fb5b26f7e861a5d0bddbfdbff496286e25d51` |
| `replay-probes.log` | `562b0038e1be06d8c7596e4608e29c38edb80e32958951df3f99c59c53685943` |
| `replay-probes.mjs` | `8938f2e6251f38f560f580b5e392cd1cdbea781a22cc4131aa74c1b6d1be530a` |
| `reviewed-b32dc7f-document.md` | `aee2435fd736c3ce4a68f1b18b1e459490f89e4d9eb036ab6820b62a3711beb2` |
| `run.mjs` | `9b8dcd12f9a357f16c04947293cb4032e47aa0babf66b59bbbc0c6ba3a125b07` |
| `schema-parity.json` | `4c9614c29dc64cfbda6acac9b3f1adf495ac3ce4d15c32aadf448edbd7348a32` |
| `screenshot-parity.json` | `49a90a2110ebfaac5d66c44b38744b9d8ce4c05d1164257da03764c29a46d9eb` |
| `server-order-results.json` | `74036e688920c97fb2f7555b3b0f6ada5e74eea5160274a3aa810deb2e21afcf` |
| `server-order.log` | `177aba7a8593e9cd35e1a2a62b02964f48f5943da84d155109810790a5320e93` |
| `server-order.mjs` | `0a081eaa1c80d15b4636e041d8a31558e34319284b5bac14b9c34da870947c95` |
| `source-review.json` | `e512f33b4429d56d34dad4212a6188492b872bfdf86cf1dbade1252797ab9ca6` |
| `source-review.py` | `6f0c5f3fe7940f770d0936e7617201fb0813b243f950a8b40f2a5854776b2170` |
| `two-pin-api-inputs.json` | `53ed390d13f52dd596a278921e563883eb2a51453209f2a9e53e4ab5be7247d1` |
| `two-pin-api-order.log` | `471ddf7422e49cd02745c6ab59a7e2b519e92c816e23d0b95fc8a48c6b0ee141` |
| `two-pin-audit-production.json` | `fc127bcdae1a092e15a32439821f61de093537f45dc889057c89809cd5f27394` |
| `two-pin-audit-production.log` | `c0cd6892d6e56d1d76b921f7a7ba1afb5d423cb58cc03684635fd4ad6ab507d2` |
| `two-pin-browser-inputs.json` | `8e2e6c523789ef9426b1b5cb3260e3334e716a7c34dc2539b4fabca46382215a` |
| `two-pin-browser.js` | `9911f0b0449132c90af128d97be74d958269b3a48e4f9636588bf143056c588c` |
| `two-pin-build.json` | `11f57d9fe4b4a22529aa55c90ba2312143e61e9623a6b5283986e49200be8022` |
| `two-pin-build.log` | `834173858b6c66deced8e09b84efa2685a698140f2806293d68257c39d403817` |
| `two-pin-catalog-inputs.json` | `5992e56575b8a96303a5298d8e8a9069e1debc8c3dabe8c06e109d21b8d93e9d` |
| `two-pin-catalog-order.log` | `f6697a4009a2cbc716af5f2e488a23c276708546f4c5a335fb34412b1d0fa90d` |
| `two-pin-chrome-1280-fixture-error.png` | `5ace104eda79e23e212e35fd4710885feefd5fa0cc8f10fb8062b0a13926d3de` |
| `two-pin-chrome-1280-fixture-selected.png` | `0559eb9b52935fc5c10b3ba11b06d3c523571094fd295213a1ea1fb94f9948d6` |
| `two-pin-chrome-1280-production-app-error.png` | `348d5714586e6a9ce34849ed782a9120fa8f7db6e0f2aeb546313b5ff4f446a9` |
| `two-pin-chrome-1280-production-app-selected.png` | `ad10922f31a0baa46848b43b6a2bed232756d7d524d5f6340243c5235c55a613` |
| `two-pin-chrome-390-fixture-error.png` | `10acd69ed148aedd763ae71404dbf16b4fd6bb9093b287434b4614ac42f1a36b` |
| `two-pin-chrome-390-fixture-selected.png` | `a1fe1f0848260a44b4bb23f9d04f9d08688b2a6e1f540403e2317866209a9869` |
| `two-pin-chrome-390-production-app-error.png` | `657ec8578902eeb165222e10c9102f5edac78fafb897990ce26790dec87bebe7` |
| `two-pin-chrome-390-production-app-selected.png` | `17981629642bc2400a88362f144eec88df5b6ba61f3c4368a7c4b7551541f8a6` |
| `two-pin-ci.json` | `751110601b0fad97bbfec8922ddcdf798978e1ac4f08840269b65f92e62b0e6e` |
| `two-pin-ci.log` | `6fc41a98d57450117c205b800ba1651f4617dd4ebb8757aa3fae03b1be79bb4e` |
| `two-pin-contract.json` | `59632ad29b40213a53a43c30526a0289c10ddd4e4d4d708bccb38785953467b5` |
| `two-pin-contract.log` | `f9453f99d4893c967a7f6b9b0778e8237d9b1c93475fb16c5ca383c7b1464406` |
| `two-pin-dev-http.log` | `c81897fa487ccba291a8b04fa1e9f1740d484fb1ccd29e6069815b09e2c814d8` |
| `two-pin-dev-inputs.json` | `a940e81f73817ee805b2751ca464a4849220f8b14e13cd82bcd6c91316450d68` |
| `two-pin-dev-order.log` | `f487436b1e4faf4fc88eaec7580d69e82ecc5eb9787014d9752704eeb2552471` |
| `two-pin-emitted-api.log` | `8889a713881b5f2b789e1d0d7994702b39d08fd89695e0627a7e5ebb828d58d6` |
| `two-pin-manifest.json` | `9d10292b5f727ca30fa8699e40c1d65ad2cd05b62dbd382c175c4da9ee1e24ba` |
| `two-pin-runtime.json` | `a3b791c26740ae9e7d3824b1b6e1f4f6c25aa218317090527bca6c22a9dc829a` |
| `two-pin-runtime.log` | `ffb404ca59a9c45c63f637858b75df9394de2cdf01981fe930e809ede733aa51` |
| `two-pin-strict-declarations.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `two-pin-tree.json` | `5a2c9db2c7ab4fbe0133d15721d3e626c9f6b6c1201f25523fa76ae4df8a10ad` |
| `two-pin-tree.log` | `e75752e9b66b1af4f4d4c643c9adc1027f5705ed042de03d3f3e0245023066fd` |
| `two-pin-webkit-1280-fixture-error.png` | `616a296bf6dfc792957287da25d13d842ca1ab398ac749c728d6c88ad34edd9c` |
| `two-pin-webkit-1280-fixture-selected.png` | `d27b07b5d439e3545e55e0708aef8e83f0325bccc0d273fe148a4e29fecb90a3` |
| `two-pin-webkit-1280-production-app-error.png` | `1d8d1668b5f428f57698e5ee6ba4bb701913653ab7a2acaaa5e2106722636fde` |
| `two-pin-webkit-1280-production-app-selected.png` | `56729ee4b0e3d458e7c3d95601d03cb03604d5f6e36e2ff9934bde3c5c3ab9a2` |
| `two-pin-webkit-390-fixture-error.png` | `e4d2941c488fb523743666d8c9fddf83bc01c5e29c631fd09dba2fe3187989ab` |
| `two-pin-webkit-390-fixture-selected.png` | `d6f74fc0f9a315cc94cb059569e27ae9568ab7efcb8b7fe5badcde56f163f544` |
| `two-pin-webkit-390-production-app-error.png` | `71e1dbecbd663c48bcebc09fd1b341a53c898ec958ae63709d63323091737204` |
| `two-pin-webkit-390-production-app-selected.png` | `4db3f129fec257c9a91124e3a5fc09be22c5802be697348cbf4d42d7410b8c66` |
