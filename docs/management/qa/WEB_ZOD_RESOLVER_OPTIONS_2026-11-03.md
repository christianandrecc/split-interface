# Archived independent fixed-Zod/resolver options review — November 3, 2026

GM read the complete final report and verified original report/ledger hashes plus all 66 independent artifact hashes/lengths. Temporary links below are artifact filenames; originals remain outside Git. This is bounded disposable compatibility evidence. Actual-app strict-CSP bootstrap qualification and corrected standalone replay archive remain open; no application migration or release is accepted here.

- Original `QA_REPORT_ZOD_RESOLVER_OPTIONS_2026-11-03.md`: `bea3369ede545185a176f30b06d252f65eeb7a90861b47366ae7de249903714e`
- Original `verification_ZOD_RESOLVER_OPTIONS_2026-11-03.json`: `9ceb59d4d2bdae198abf3fe985e4b54561937e2042e1ed5694fbc462cd445b4a`

---

# Independent options review — fixed Zod and compatible resolver

**OPTIONS_COMPATIBILITY_CONFIRMED_WITH_GATES.** The disposable `zod4.6.6` + `@hookform/resolvers7.0.2` pair repairs the demonstrated Zod4/old-resolver incompatibility and passes the bounded fresh checks below. Its installed production audit is clear. It remains an option, not an accepted application migration: CSP telemetry differs, the actual-app bootstrap remedy has not been qualified here, and the original archive omits its replay manifests. No current app/branch was changed and no migration, integration, gate waiver or release is authorized.

Reviewed option packet: `/Users/christiancarrera/.codex/artifacts/split-web-resolver-options-2026-11-03.md`, identical to archived `RESOLVER_OPTIONS.md`, SHA-256 `237c6181c74e5d82310776aba18b3215dff3c29d055e6af1759e1b402b9fb9c2`. Disposable base is exact7ea23599d2b69adb33f2bc7a3299342f95386a51, with no candidate code commit. Base source tar SHA-256 `0a6a4e01cc4c070dcf8428ebf5e92e6df1a6cf90c0232f75cfb89863aa8bf058`. Candidate lock SHA-256 `c427b3f098e3c8780b4514f01f2c3f8bb89788b889a48096f72a57acfc1d3c12`. It lacks the separately accepted325f64d focus correction; no combined candidate has been tested.

## Findings and decision gates

**E1 — Original archive cannot support its claimed standalone replay.** Bundle `232ed1b9ee83f279c9a2792eec43e5e94781c5eaf82e1f790437ed1acfd6793f`, index `5194b691194ad776afa6d1004007c26bfcde41bb925a2a422f9085e59256cb5b`: every one of109 indexed files passed independent size/hash verification, but all six `probe-manifests/<three variants>/package{,-lock}.json` files are absent. The archive helper's variant-name skip set applies recursively and skips those nested directories. The first independent prepare attempt stopped at the missing control package file before install/app execution. The failed preparation is preserved.

The six external preserved files were separately snapshotted and verified against the package digests in each indexed400-file variant manifest, including exact candidate lock c427b3…. Fresh replay therefore used a proven **external supplement**, not a complete original archive. GM was informed and requested a new versioned corrected bundle while retaining the original. No corrected receipt/bundle was supplied to or verified by this review; no new archive is assumed accepted. External-manifest proof (`external-manifest-proof.json`).

**C1 — Two-pin CSP telemetry change is confirmed, including the actual compiled app.** Under local `script-src 'self'`, Chrome156.0.8078.80 and Playwright WebKit26.5 each report one caught blocked-eval event on a fresh candidate fixture page and one on a fresh actual production App page; the Zod3 control reports zero. Form/search/draft interactions continue working with no page error. This is a measured behavior difference, not a failed validation or a reason to permit unsafe eval. Repository vercel.json sets no CSP; hosted headers were not inspected.

**C2 — The bootstrap remedy depends on construction order and is a different option.** Installed Zod4.6.6 source and its public config declaration confirm `jitless`. `util.ts:517–534` lazily probes `new Function` and catches failure; the jitless guard skips it. `schemas.ts:2390–2393` captures JIT eligibility while constructing an object schema. Fresh independent isolated tests in both engines show: control default0 events; candidate default1; candidate config **before schema import0**; candidate config **after schema import1**. All valid/invalid parses behave correctly in those8 tests. This corroborates and extends the owner's four isolated checks; it is not qualification of a full actual-app bootstrap, chunk graph, development mode or long-running performance. The two-pin candidate was not silently given jitless configuration.

Recommended bounded next candidate: a **separate disposable actual-app option** retaining this exact pair/lock and introducing the smallest explicit early bootstrap whose execution precedes every transitive Zod schema construction. Prove production and development module ordering, strict-CSP first load/dynamic flows, the actual sample search and typed resolver behavior, production assets and bounded performance. Compare it against the unmodified two-pin option and preserve both. GM has separately requested that work; its future results are not part of this review. Do not weaken CSP, remove the resolver, select API caps or combine existing branches through this report.

## Exact package and source scope

Two root declarations change from base: Zod^3.25.76→4.6.6 and resolver^3.10.0→7.0.2, retained in dependencies. All other398 tracked files are byte-identical; source was checked before config imports and after every execution. No application call-site, business/signing/PDF/API/schema change, source rewrite, override/gate change or React/RHF/TypeScript major is needed by the tested pair. React/ReactDOM18.3.1, RHF7.61.1, TypeScript5.8.3, Vite7.3.7 and Vitest4.1.12 stay unchanged.

Exactly12 lock records differ: root, Zod, resolver, new Standard Schema utils0.3.0; two dev→devOptional flags; six same-version AJV6.15.0/json-schema-traverse0.4.1 relocation records into ESLint consumers. AJV is not upgraded. Fresh installed trees are valid. The only mandatory resolver peer is RHF^7.55.0, satisfied by7.61.1; optional Zod^3.25.0||^4.0.0 is satisfied. Other optional adapters are unused and were not certified. No browser floor is declared in package metadata; that is not runtime compatibility proof. Package/peer review (`package-review.json`).

No architecture or current accepted/normalized product-value change was found in the inspected source and supplied cases. Consequential differences remain explicit: raw Zod error API/codes/messages, caught CSP telemetry, bundle size, and the prospective initialization/performance effect of jitless. A body-byte/collection cap would be a separate API policy change; no such policy was selected or implemented.

## Fresh independent execution

Node24.22.1, macOS arm64, two fresh400-file exports reconstructed from the verified source tar and separately proven exact manifest/lock pairs. Tracked files frozen/read-only, zero live .env files; config imports/builds run from verified exports with scrubbed app environment. Clean npm ci uses the exact locks and install scripts; neither lock was regenerated. No owner checkout/browser/Simulator was used.

| Check | Independent result |
| --- | --- |
| Strict declarations | PASS both variants: tsc strict +skipLibCheck=false over actual AppleMusicTrack schema and typed RHF Input/Context/Output and raw-Input forms. No any escape in those strict type probes. |
| Actual-schema cases | PASS46 per variant: same acceptance decisions and accepted outputs. Raw error details intentionally differ. |
| Resolver contracts | PASS14 per variant, all returned/zero throws: async/sync valid/invalid/raw, first/all errors, nested paths, transforms, async refinement, input immutability, native error set/clear. Native call sequence independently checked. |
| Application regressions | PASS26/26 across four files: sample search8, Apple Music server15, deployment1, error boundary2. Candidate full app typecheck passes. |
| Install/tree/build | PASS both clean installs, installed trees and production builds; scripts/override unchanged. No full869-test duplicate run. |
| Mounted RHF + actual SampleTrackSearch | PASS four flows: two variants×Chrome/WebKit,390px. Invalid focus/field error, trimmed valid submit, normalized sample select/remove, malformed-response generic message. The resolver form is a test fixture; current shipped source does not import resolver. |
| Actual compiled App | PASS in each of those four flows: local draft edit/input/calendar/Escape; no production horizontal overflow. CSP observation recorded separately. |
| CSP ordering | PASS8 isolated cases establishing default/before/after behavior above; no actual-app bootstrap qualification. |
| Browser health | No page errors, console warning/errors or attempted foreign requests. Expected CSP securitypolicyviolation events are recorded explicitly rather than hidden by the pass flag. |
| Visual readback | Candidate Chrome/WebKit390 malformed-response UI inspected; generic error is legible and paired screenshots are byte-identical. Debug JSON overflow belongs to the fixture output, not shipped UI. |

Browser plugin not available; the frontend-testing-debugging skill's isolated Playwright fallback was used. HTTP/WS routing and service-worker blocking restrict app traffic to loopback8291/8292 with synthetic API/session data. Node network shim guards external traffic; it is not a machine-wide background-browser firewall. Runtime harnesses were independently executed from archived owner probes, with path/port/subset adaptations; extra production-CSP observation and the before/after ordering probe are independent additions. Existing full-app test source was unchanged. All review processes closed.

**Fresh configured audit** (`npm audit --omit=dev --audit-level=moderate --json`): candidate0 findings/exit0 at 2026-11-03T20:39:37.583Z–2026-11-03T20:39:38.041Z; control1high/exit1 at 2026-11-03T20:39:32.800Z–2026-11-03T20:39:33.354Z. Candidate full audit remains12moderate package entries/exit1, 2026-11-03T20:39:38.081Z–2026-11-03T20:39:39.611Z. Actual unchanged application still has its Zod finding. No waiver, blind minimatch override or deployment gate acceptance is implied by this disposable audit.

Independent production JS delta is **+35090 raw/+13027 bytes summed per-file Node zlib gzip**; CSS is byte-identical. Owner's build reports+35090/+13025. Small gzip/absolute-byte differences across these isolated build environments are recorded, not described as a network or performance benchmark. The standalone mounted fixture bundle is not the production bundle.

## Behavior and remaining limits

Zod4 uses issues instead of the old errors alias and changes default messages/codes. Compatible resolver7 returns structured errors, but default blank-title message changes. Current actual SampleTrackSearch maps schema failures to the same generic user message; malformed response screenshots and explicit HTTP error paths match. Future consumers of raw validation errors need deliberate review.

Both client/server materialize response.json before schema validation. Fresh bounded runtime probes reproduce the client8-track cap, reduced Zod4 issue accumulation on malformed large arrays, and continued processing of10000 upstream records/large ignored fields. These are neither byte bounds nor a general resource/performance guarantee. Limits, partial-result policy and handling late valid records remain separate decisions.

Syntax targets Safari16.4/Chrome111/Firefox128 compile, but only current Chrome/WebKit ran. Linux, exact minimum browsers, actual Safari/iPhone and hosted/provider integration remain open. Unchanged application AbortSignal.any/timeout calls are pre-existing runtime-floor limitations; no new floor or polyfill was established by this dependency probe. The base still lacks the accepted focus correction and retains other toolchain advisories. No combined candidate, full GM02/beta acceptance or release approval exists.

Owner869 tests per control/candidate,14 resolver cases,46 schema cases,eight browser scenarios and four CSP supplement checks were read back as developer evidence. They are distinct from this review's fresh26 tests/28 resolver-case executions/92 schema-case executions/four mounted-production flows/eight ordering cases. The Zod4+old-resolver negative control was read back; it was not freshly repeated because the fixed pair and original control were the bounded replay targets.

No application/branch dependency/source change, merge, push, deployment, cloud/provider/Supabase/DocuSign/demo/OAuth/email/upload/tunnel, credentials/configuration load, schema/RPC mutation, spending, legal publication or distribution occurred. The next decision is which concrete disposable CSP/init option to qualify and then whether to authorize a bounded local migration; this report selects neither production behavior nor byte/collection limits.

Evidence ledger: verification_ZOD_RESOLVER_OPTIONS_2026-11-03.json (`verification_ZOD_RESOLVER_OPTIONS_2026-11-03.json`).

## Screenshots

Screenshot artifact: `candidate-z4-r7-chrome-390-resolver.png` (digest below).

Screenshot artifact: `candidate-z4-r7-webkit-390-resolver.png` (digest below).


## GM-verified independent artifact digests

| Artifact | Bytes | SHA-256 |
| --- | --- | --- |
| `browser-replay.log` | 447 | `aafaa599ba7ddc51346139db746ead9020f262210c100efe5d1e8004ae6a25d5` |
| `browser-replay.mjs` | 8766 | `0f3e3b7f35352823ea523012c129652b79282256f9ec10779fb10e75bf269382` |
| `browser-results.json` | 7781 | `e4511eed45289eded064bfb0c8cf97fb82aebf996ea0c225368ac0a6859f0dd1` |
| `candidate-z4-r7-audit-full.json` | 539 | `67fe86f9bd27f164bbd6b0390733ac72be211acc6767a82c94643a845f4e7b44` |
| `candidate-z4-r7-audit-full.log` | 7144 | `b177520675a58cee2cef94eaa0072ba0b1c1a823de56cd37b989b5753acaf8e1` |
| `candidate-z4-r7-audit-production.json` | 587 | `681d166ee56e5abcbcb8ee604f4f9e76c68a80e1b943f34da41d3a72dd48465c` |
| `candidate-z4-r7-audit-production.log` | 366 | `c0cd6892d6e56d1d76b921f7a7ba1afb5d423cb58cc03684635fd4ad6ab507d2` |
| `candidate-z4-r7-browser.js` | 750758 | `7fcc7145408926712fe128feceb969dbd3a0d1f98729f8f9465dcb8ba8becbcd` |
| `candidate-z4-r7-build.json` | 536 | `62c416b69061ec614c24327d49ca320de6b32ebbece596ce17e3f91a25583a42` |
| `candidate-z4-r7-build.log` | 3811 | `4608041f1fc155348231d768bc603aacfcce9f8303cfddf1bd3f506302f6aa61` |
| `candidate-z4-r7-chrome-390-resolver.png` | 39090 | `63ce93d3c5aa3e1996fce9412310bf43b3a97cfbf1811a6d129dc629d5d8613f` |
| `candidate-z4-r7-ci.json` | 557 | `43fa640d7257c843858ffa3409a4a976d515b32a1c5dbe612b51073f683ff6ef` |
| `candidate-z4-r7-ci.log` | 329 | `6fc41a98d57450117c205b800ba1651f4617dd4ebb8757aa3fae03b1be79bb4e` |
| `candidate-z4-r7-contract.json` | 5250 | `59632ad29b40213a53a43c30526a0289c10ddd4e4d4d708bccb38785953467b5` |
| `candidate-z4-r7-contract.log` | 3029 | `f9453f99d4893c967a7f6b9b0778e8237d9b1c93475fb16c5ca383c7b1464406` |
| `candidate-z4-r7-csp.js` | 459246 | `bb0927d716b9a03589586e88e5046cfc876f8741c5fbd2f887571980fff1185d` |
| `candidate-z4-r7-focused-tests.json` | 830 | `6a1c43e2be6245c7f2f926d0998d52580a2bff074ff752f1f9bdf3e1bb45e649` |
| `candidate-z4-r7-focused-tests.log` | 8354 | `2a214a6db8da69beb9f2ee73d65f71b59f2e34e7d46013acfbe2afcebc5d5850` |
| `candidate-z4-r7-manifest.json` | 66644 | `b4465f900084426ba6669a9b0c34cc79138587a35a9189f5aaadb827aade7ea6` |
| `candidate-z4-r7-runtime.json` | 21465 | `0a293c3cccc9d545b15b6e4d7cfc5592447908831ae73d0630967dbb2cdcc6a4` |
| `candidate-z4-r7-runtime.log` | 12939 | `d83c51e568be80d490db1ecb0d40f022718048694f825f88700d27e6de115feb` |
| `candidate-z4-r7-strict-declarations.log` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `candidate-z4-r7-tree.json` | 549 | `f3452447a06a7534253dd54c2d620e1e3e8688013b2d7467f005fef028069334` |
| `candidate-z4-r7-tree.log` | 155834 | `e75752e9b66b1af4f4d4c643c9adc1027f5705ed042de03d3f3e0245023066fd` |
| `candidate-z4-r7-typecheck.json` | 540 | `2d4ec00065da819cfc44054c530405bde7f8af7d5c7f47eaf2eafac0067bd094` |
| `candidate-z4-r7-typecheck.log` | 115 | `9bf4a0307d01ec987b24f80271364b57774ef086bd2be33e09688e4232fd7132` |
| `candidate-z4-r7-webkit-390-resolver.png` | 51447 | `5279a2f00aabbef42fb2c922c924b6eb9b7d393e1fdafb22871a0fd0eea5a325` |
| `control-z3-r3-audit-production.json` | 585 | `646beb8d6d8202e1961e3474a4f23b31ed624a544c6b5fdf4dda6980edbbc02c` |
| `control-z3-r3-audit-production.log` | 1212 | `b7b567951423a4636d6f7b061131a66f26611215b8cffb362c19611df24fa0d8` |
| `control-z3-r3-browser.js` | 354309 | `010dfb9251ec0ec1be3aa10be80a94ad591c6b89b79507bafff99f65437d62f0` |
| `control-z3-r3-build.json` | 534 | `c9fb4313d97b3e239f44a3399cdd1fc69b6160eb6086d38d845853a1f1147745` |
| `control-z3-r3-build.log` | 2870 | `3ffa636d26c88dfe0874af835cb2173574f211dfdda52f40b47f6c38419400d3` |
| `control-z3-r3-chrome-390-resolver.png` | 39090 | `63ce93d3c5aa3e1996fce9412310bf43b3a97cfbf1811a6d129dc629d5d8613f` |
| `control-z3-r3-ci.json` | 555 | `9a4f2e91db50699fa2abdcef20fb27e0dbdd59cb45b2726bbcc8b603ce0c288d` |
| `control-z3-r3-ci.log` | 329 | `c82897fe774897f03d2bdb65233f1166281907cc40f6b38118a18f02e45dd2ba` |
| `control-z3-r3-contract.json` | 5089 | `5d43a72bf8c3ee411b071fc325e6e30dd05304a7e229629f76fec7ba79f5e769` |
| `control-z3-r3-contract.log` | 2868 | `37c3bfaa3eda72ad801c927dcd0d0c21ea49dac683d80889b255a8928e6cd574` |
| `control-z3-r3-csp.js` | 62006 | `203f9636dd14fa12ba187296796f4c91366a953b14ba8c04ca0b0a8ff373d552` |
| `control-z3-r3-manifest.json` | 66642 | `cabf831c1f2062957661340c69d8c80a81614f82819eef3d848764505853a385` |
| `control-z3-r3-runtime.json` | 22051 | `40efad5057bdef04e33a39b4aea2c6797f66b067f35e7ceaf7ba6e43a7dba536` |
| `control-z3-r3-runtime.log` | 12945 | `450a7717504e7fa78df715f093c6bf32ab0115576c5786874e762387f7073e1b` |
| `control-z3-r3-strict-declarations.log` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `control-z3-r3-tree.json` | 547 | `e733cc9fdb166712feda4e23a85caf254ed2a5e36563196e04013cfc6911f435` |
| `control-z3-r3-tree.log` | 154294 | `43bdbe2b6384a7e78b425e7c539302858d173a2b8731d9840fbb2d5869c2bb91` |
| `control-z3-r3-webkit-390-resolver.png` | 51447 | `5279a2f00aabbef42fb2c922c924b6eb9b7d393e1fdafb22871a0fd0eea5a325` |
| `csp-order-results.json` | 5961 | `db88fbf02cf77e7d077544a71e4de3b8aa7c65fac88fe764b91d036ef88e0728` |
| `csp-order.log` | 27 | `35e3875b59ff12f7b0363315db6416ec041c27de000727895db4a8966ddc0605` |
| `csp-order.mjs` | 4037 | `4f183072106a285e1fd0847e93d810fd813e4dff8c0ef16f70db65f570ce718d` |
| `csp-order.ts` | 654 | `a49bf352aa832d7de6579c675ff721abdbdcc2698e6b6b43144a28238384da2f` |
| `developer-readback.json` | 5404 | `6a0d6562da757b839a4b11b89687066cc5398127cb9b5ab94460969153ac3a34` |
| `external-manifest-proof.json` | 2159 | `5c6f80442e65e8079183b505fc7dbb2333e6e9922cce469eaa60702ce1ac22fa` |
| `finalize.py` | 18571 | `cbf4f3034668efa3fd5a0662b6dcd15298c9b209ae69b38a191bf7780728b476` |
| `focused-results.json` | 9696 | `024ae47269ce3bd067e187ee9293edc4e4c1b82385bf7cb57d0e9a6bfbacd9f8` |
| `network-deny.cjs` | 1638 | `a3d732d322c2df4feebc566f538095220eda6ccff621024c2b3f8bb7ebf2ec84` |
| `package-review.json` | 6129 | `f6cbb9e1a911125e9e0b06d75175c266bab056a8d1e90b9426326dcafb3110d7` |
| `package-review.mjs` | 1975 | `b2f397c396e184e4214a7279410bffe17dbc2582bbd32ca92f9cb688663842a5` |
| `prepare-attempt1.py` | 2816 | `dd33184e5f08b470ea241565067f6240cd3c4a3386d13f591309f8145a7cd239` |
| `prepare.py` | 3100 | `878af9298ff7cc3984ff7b321b2dcaa675e0fcc9752a11c7c2008857f927091f` |
| `probe-replay.json` | 4084 | `36c318af48c1f304910a76124c6c9a8c545d9ad492afdaed1adb8d8be0273de8` |
| `production-asset-comparison.json` | 935 | `f20533b554ae38fd9c87a99fc2812607adb18453663d602b64cbe411963b9235` |
| `provenance.json` | 783 | `08b14fa12547d6446cc1a97c0f44276590db8298d96e2d0f3dc5a2de7563fa2f` |
| `replay-probes.mjs` | 3254 | `1763e512920668ee56ecf675c7cf9cfe373741cf0310d23273020a5c7972587c` |
| `run.mjs` | 2117 | `9b8dcd12f9a357f16c04947293cb4032e47aa0babf66b59bbbc0c6ba3a125b07` |
| `schema-parity.json` | 22494 | `03497ca57405867cde0afc8f9d65c777ca67eac617bde323ae66f7e13108040e` |
| `source-review.json` | 16791 | `41a723a6883674c7296ebd4589b896204a5ab9b6b9e9a4ea803ee9138126ee0d` |
| `source-review.py` | 2021 | `ad91f35c3987e2cd260fc21b830b25fa34af211c66706de3f9c71a8c9f2dccb8` |


## Subsequent dependency-artifact retention

After this completed review, its disposable installed dependency tree was removed during [bounded QA space recovery](../QA_SPACE_RECOVERY_2026-11-03.md). All source/provenance remains hash-identical. Ledger-referenced dependency binaries/source files were copied out with exact hashes and durable path mappings before removal; original dated ledgers were preserved. Reconstruct the installed tree with its exact lock for any future execution.
