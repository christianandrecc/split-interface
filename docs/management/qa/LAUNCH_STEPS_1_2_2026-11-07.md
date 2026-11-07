# Local launch QA and signing progress

November 7, 2026, America/New_York. Founder asked to begin local platform QA and signing/retrieval. The selected beta remains web plus iOS. This record distinguishes fresh GM checks, owner execution and pending independent acceptance.

## Web full-app Firefox input and test

The corrected owner run for exact `49eacadc9d2b23639059fc07d2b53a1d133a746c` completed its one script-disabled install and one network-denied Vite build. The follow-up inspector stopped on a missing Vite environment object. GM checked the actual emitted Supabase client call and verified that it uses the synthetic loopback URL and noncredential marker as direct constants. The owner failure receipt is preserved. Phone and telemetry were disabled in the build inputs. Runtime behavior requires browser evidence. [GM build verification](/Users/christiancarrera/.codex/artifacts/split-gm-web-dist49-verification-20261107/verification.json)

GM compared all 400 exported tracked app files to Git, all 39 dist entries (37 files and two directories) to the build receipt and 27 previously parsed local references to their file hashes. A fresh dist archive matched every entry on extraction and the source dist recheck. Dist inventory SHA-256 `9779f01fa09a9c35e6eebdd8f1959dcc29a271520f2e2de4a8e51f8f21b224f7`. Archive SHA-256 `9bd24a041c8d0e0a4cc9db32fe73c7cd5ed90da5d4b090328ecf480ed7df27fa`. [Verified archive](/Users/christiancarrera/.codex/artifacts/split-gm-web-dist49-verification-20261107/dist.tar)

Web owner started GM02C-FULL-FX on the verified archive. Firefox 153 desktop and narrow contexts exercise synthetic account A's draft detail, edit, save and reload using intercepted requests. A separate B context must fail to reopen the same draft even when seeded with A's stale cache and the direct link. Exact Firefox 128, Chrome 111 and Safari 16.4 evidence stays open.

## Native signing artifact authorization

Owner delivered `f5c92bb0a8735dcde0a0961cb9a53fe44e3df649`, nine new standalone Swift files from `01de78adadcaa4068f71169414c75315e2108bbe`. GM verified all 673 parent entries and 65 indexed files. Owner reported 29 XCTest passes, Release build, installed iPhoneOS SDK compile/link targeting iOS 17 and four fault controls. GM preserved 67 originals with bundle SHA-256 `5f98d3c4ffb8eeca8843518352f49a10c5d4fcdec85cc707425abe553b962d0a`. [Owner report](/Users/christiancarrera/.codex/artifacts/split-native-afp1-composition-20261107-a2o139l7/AFP1_OWNER_DELIVERY_2026-11-07.md) · [Preserved packet](/Users/christiancarrera/.codex/artifacts/split-gm-afp1-f5c92bb-owner-intake-20261107/original-evidence.tar.gz)

GM freshly verified 27 tracked package and asset inputs from Git and ran the exact candidate's 29 macOS XCTest methods with zero failures. Two independent disposable faults executed unchanged tests. Omitting reauthorization on a resumed error yielded unavailable instead of denied and failed the access epoch assertions. Checking quarantine before authorization yielded integrity instead of denied. Both faults built and failed their expected assertions. These tests add exact-candidate baseline and negative-control evidence. Additional independent QA is active for final grant, parser/page and ownership behavior. The next host and sharing handoff is being prepared pending that verdict. [GM test evidence](/Users/christiancarrera/.codex/artifacts/split-gm-afp1-f5c92bb-smoke.FXzB3tDl/GM_TEST_EVIDENCE_INDEX.json)

## First physical iPhone pass

Xcode device inventory returned no devices. When a suitable iPhone is attached, use the existing Debug fixture modes on an agreed exact native app commit and record model, OS, build, outcomes and any local signing prerequisite.

- Use `--fixture-workspace --fixture-persistence` to create a synthetic incomplete edit, lock and unlock, terminate and relaunch, and confirm exact input restoration for the same account and isolation on switch. Use the reset flag only on a fresh disposable installation.
- Use `--fixture-auth --fixture-invitation` to test signed-out invitation continuation, matching-account review, cancellation and invalid links. Controlled real inbox and universal-link proof need an approved integration environment.
- On the actual phone enable VoiceOver and exercise the same steps with large text. Verify the form's labels and order, reachable controls, readable errors and that invitation review does not imply approval or signing. Record physical and minimum-iOS checks separately.

DocuSign execution, original signed PDF and certificate retrieval, and the production old-client guard remain later implementation and integration gates. This phase uses local fixtures.
