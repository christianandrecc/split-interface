# Web parsing resource evidence readback — November 3, 2026

GM read the full owner report and verified all 82 indexed artifact hashes. These are developer-executed measurements, not an independent benchmark or a new performance acceptance gate. Exact web49eacadc remains accepted only within its separate combined local QA scope.

Evidence root: `/Users/christiancarrera/.codex/artifacts/split-web-parsing-resource-20261103-01`. Report SHA-256 `65f73c8e77a1d89ecd1da61533cc3ee6737acd844f2c89601fd862e77949bfd8`; index SHA-256 `23f3cd82219c5aa3675538f4f7a27e6ce2a300816278375a2b2530abe7b4b241`. Original report and evidence remain unchanged.

---

# SPLIT: Bounded Local Parsing and Resource Report

Date: 2026-11-03. Evidence root: `/Users/christiancarrera/.codex/artifacts/split-web-parsing-resource-20261103-01`.

## Outcome and Scope

Completed one bounded run: **9 sequential Node processes, 25 logical cases, 300 observations** (one first-use observation plus three warm repeats per case/variant). All expected normalized outputs and acceptance/rejection decisions matched across all three variants. No timeout, OOM, source write, install, real transport, provider call, account operation, or deployment occurred. This is descriptive local evidence, not an SLA, performance gate, denial-of-service certification, policy/cap recommendation, or release approval.

- Baseline: exact `7ea23599d2b69adb33f2bc7a3299342f95386a51`, Zod 3.25.76, resolver 3.10.0.
- Selected: exact `49eacadc9d2b23639059fc07d2b53a1d133a746c`, Zod 4.6.6, resolver 7.0.2, configured `z.config({ jitless: true })`.
- Optional default4 control: preserved two-pin source based on 7ea, using the selected export's already-installed Zod 4.6.6. Its package and lock bytes match selected. Its measured catalog/search sources match baseline, and selected differs there only in the configured-Zod import. No deleted dependencies were recreated. This is a same-lock control, not another deployable candidate.
- The word jitless refers to Zod schema code generation, **not** Node/V8's `--jitless` runtime switch. The entire Zod3-to-selected difference must not be attributed solely to JIT.

## Method and Limits

All 400 baseline, 401 selected, and 400 control source files were checked against owner manifests before imports and after measurements. Critical files were also compared to exact Git blobs. Installed Zod, resolver, esbuild, and platform esbuild packages were checked against lock entries and file-tree hashed. A scrubbed environment, isolated HOME/TMPDIR, and real-transport-denying preload were used. macOS's injected encoding variable is recorded. The two preflight-only harness corrections are retained in preparation-notes.md and preparation-attempt2; no measured run was retried.

Actual catalog normalizer and client search code were bundled by the existing esbuild 0.28.2 into standalone ESM with identical build settings. Only the Supabase session import and fetch transport were replaced by fixed synthetic responses. The real API handler, auth SDK, provider HTTP transfer, DNS/TLS, decompression, serverless startup, browser, concurrency, and live account/email behavior were **not** exercised.

Each child used Node **v24.22.1**, darwin/arm64, Apple M3 Pro, `--max-old-space-size=512 --expose-gc`, and a parent **30-second hard timeout**. The 512MiB limit is V8 old-space, not total process RSS. Source imports were fresh per process; OS file caches were not flushed. Variant order rotated across three process groups. Each case ran once for first use, then exactly three warm observations. Forced GC occurred outside measured pipeline windows; this deliberately changes normal allocation cadence and is not a sustained-load simulation.

The raw JSON strings already existed in memory before timing. Timings separate (1) synthetic Response construction/body encoding, (2) Response.json body consumption/decoding/full JSON materialization, and (3) actual normalization or client validation. Client validation includes the post-JSON async return/catch path; total includes mock-session and instrumentation overhead. Memory sampling and observer overhead are not subtracted. There is no isolated pure JSON.parse or network-transfer benchmark. Medians of stages need not sum to the total median.

Resource snapshots: 19; memory-pressure free percentage 54-54%; swap used 10081.56-10081.56MiB (no growth during this run); aggregate process CPU 317.500-393.100%; 1-minute load 6.007-6.286 across 12 available CPUs. Other user/QA workloads were present, so this was **not an idle or controlled benchmarking host**. Disk remained at least 3102.957MiB free. Resource-reserve stop guards were not triggered; they are safety guards, not product performance criteria.

## Cold and First Use

Fresh bundle import includes library evaluation and module-level schema construction, not process startup or later dynamic schema construction. Three observations per variant, milliseconds: median [min-max].

| Variant | Cold import ms | Bundle bytes |
| --- | --- | --- |
| baseline | 2.426 [2.373-2.438] | 126072 |
| selected | 12.502 [12.480-12.565] | 765607 |
| default4 | 12.582 [12.571-12.822] | 765422 |

Zod4 import was larger/slower in these bundles than Zod3; default4 and configured-jitless imports were close. First Response construction also incurred Node's lazy web-body initialization (about 16.7-17.9ms), separate from schema import. Per-case first-use results are preserved in first-use-statistics.csv and raw logs; only the first case of each process is process-first. Later first-use cases already share prior runtime warm-up.

## Warm Pipeline Results

Milliseconds, **median [min-max], n=3** per case/variant. Includes body construction, JSON materialization, and actual validation/normalization. Full 25-case stage statistics are in warm-statistics.csv and summary.json; sub-millisecond differences should not be overinterpreted.

| Case | Baseline Zod3 | Selected Zod4 jitless | Default Zod4 control |
| --- | --- | --- | --- |
| provider-valid8 | 0.519 [0.443-0.554] | 0.457 [0.424-0.467] | 0.592 [0.542-0.614] |
| client-valid8 | 0.360 [0.256-0.394] | 0.325 [0.248-0.371] | 0.402 [0.355-0.508] |
| provider-ignored131072 | 0.382 [0.328-0.415] | 0.433 [0.359-0.469] | 0.418 [0.401-0.535] |
| provider-valid1000 | 10.884 [8.461-11.696] | 6.497 [6.392-7.010] | 5.091 [5.068-6.065] |
| provider-valid10000 | 74.759 [72.959-74.869] | 64.696 [63.917-66.038] | 51.595 [50.964-53.221] |
| provider-malformed10000 | 12.891 [9.398-13.855] | 6.712 [6.118-8.732] | 4.002 [3.962-6.629] |
| provider-mixed10000 | 27.173 [26.440-29.329] | 23.027 [21.036-23.030] | 19.069 [16.955-19.094] |
| provider-late-valid10000 | 4.536 [4.222-5.302] | 2.781 [2.747-2.825] | 2.758 [2.737-2.979] |
| client-valid10000 | 27.728 [26.013-30.750] | 4.173 [4.036-4.193] | 4.077 [3.965-4.087] |
| client-malformed10000 | 36.902 [35.633-39.621] | 0.954 [0.860-0.959] | 1.018 [0.883-1.030] |

On 10,000 valid provider records, selected measured below baseline but above default4. On ordinary eight-record inputs, the small ranges and instrumentation overhead do not establish a general speed ranking. The default4 comparison is evidence of configuration-dependent local cost, not a recommendation to restore code generation or weaken CSP.

## Selected Stage Breakdown

Milliseconds, median [min-max], n=3. Raw input bytes are UTF-8 JSON bytes.

| Case | Bytes | Body construction | JSON materialization | Normalize / post-JSON validation |
| --- | --- | --- | --- | --- |
| provider-valid8 | 1056 | 0.147 [0.093-0.164] | 0.051 [0.044-0.052] | 0.262 [0.242-0.274] |
| provider-ignored131072 | 131312 | 0.152 [0.098-0.167] | 0.132 [0.118-0.135] | 0.145 [0.139-0.160] |
| provider-valid10000 | 1337820 | 0.577 [0.504-0.600] | 3.788 [3.787-3.819] | 60.264 [59.538-61.741] |
| provider-malformed10000 | 130032 | 0.194 [0.114-0.247] | 0.555 [0.553-0.562] | 6.038 [5.295-7.977] |
| provider-mixed10000 | 411976 | 0.289 [0.262-0.299] | 1.603 [1.597-1.682] | 21.041 [19.165-21.129] |
| provider-late-valid10000 | 50292 | 0.117 [0.114-0.195] | 0.073 [0.071-0.079] | 2.553 [2.552-2.578] |
| client-valid10000 | 1417800 | 0.603 [0.588-0.607] | 3.262 [3.207-3.272] | 0.172 [0.134-0.187] |
| client-malformed10000 | 130012 | 0.129 [0.093-0.146] | 0.612 [0.594-0.621] | 0.129 [0.124-0.131] |

The provider normalizer evaluates the full collection before its final slice to eight; the late-valid cases preserve their final two valid songs. **Eight output tracks is not a provider processing or input-byte cap.** The ignored-field control still materializes the 131,072-character unused field before the schema drops it.

The client rejects arrays above eight in all variants, but Zod4.6.6's existing array capSize implementation rejects oversized containers before element parsing. It still receives a fully materialized JSON body first. For 10,000 malformed client records, baseline produced 70,001 issues while both Zod4 variants produced one size issue; all rejected. Thus the major oversized-client cost difference includes a library validation-order/error-allocation change, **not merely JIT**. Diagnostic issue-count parity was not claimed; acceptance and successful normalized outputs were asserted exactly.

## Memory and GC

Memory values are MiB from sampled process.memoryUsage boundaries, **not true allocation peaks**. Final heap includes retained fixtures, modules, small output/log records, and runtime caches. RSS includes more than JS heap. GC event counts/durations are observer reports; spontaneous events can fall outside pipeline windows. Forced GCs are explicit harness cleanup and are excluded from pipeline timing.

| Variant / process | Max sampled heap | Max sampled RSS | Final heap | Spontaneous GC count / ms | Forced GC count |
| --- | --- | --- | --- | --- | --- |
| baseline / client-large | 72.610 | 228.141 | 9.047 | 40 / 76.080 | 34 |
| baseline / ordinary | 9.233 | 67.328 | 8.944 | 0 / 0.000 | 106 |
| baseline / provider-large | 71.275 | 226.125 | 10.710 | 36 / 42.057 | 66 |
| selected / client-large | 14.729 | 84.719 | 12.572 | 1 / 0.352 | 34 |
| selected / ordinary | 12.035 | 78.266 | 11.455 | 0 / 0.000 | 106 |
| selected / provider-large | 46.940 | 156.484 | 13.142 | 30 / 20.370 | 66 |
| default4 / client-large | 14.765 | 84.906 | 12.607 | 1 / 0.349 | 34 |
| default4 / ordinary | 11.915 | 78.172 | 11.570 | 0 / 0.000 | 106 |
| default4 / provider-large | 36.581 | 130.328 | 13.291 | 21 / 11.795 | 66 |

The selected large-provider process used more sampled heap than default4 and less than baseline here; the selected oversized-client process avoided baseline's large error allocation. These short forced-GC runs do not establish leak absence, production memory ceilings, or multi-user throughput. Raw before/after JSON, validation, post-GC, external memory, GC flags/timing, and process resource counters are retained per observation.

## Fixed Inputs and Parity

Maximum input: **1417800 bytes**, within the fixed 2,000,000-byte experiment ceiling. Ordinary cases use at most eight records; larger collections are fixed at 1,000 and 10,000. No larger fuzzing or attack input was generated. Malformed provider items are skipped by existing behavior, whereas malformed envelopes and client tracks reject.

| Case | Records | Bytes | Expected outcome, identical across variants |
| --- | --- | --- | --- |
| provider-empty | 0 | 33 | accept / 0 tracks |
| provider-valid8 | 8 | 1056 | accept / 8 tracks |
| provider-malformed8 | 8 | 136 | accept / 0 tracks |
| provider-mixed8 | 8 | 571 | accept / 3 tracks |
| provider-late-valid8 | 8 | 318 | accept / 2 tracks |
| provider-bad-envelope | 0 | 2 | reject |
| provider-bad-json | 0 | 1 | reject |
| provider-ignored131072 | 1 | 131312 | accept / 1 tracks |
| client-valid8 | 8 | 1100 | accept / 8 tracks |
| client-malformed8 | 8 | 116 | reject |
| client-bad-json | 0 | 1 | reject |
| client-bad-envelope | 0 | 2 | reject |
| client-ignored131072 | 1 | 131237 | accept / 1 tracks |
| provider-valid1000 | 1000 | 131818 | accept / 8 tracks |
| provider-malformed1000 | 1000 | 13032 | accept / 0 tracks |
| provider-mixed1000 | 1000 | 40726 | accept / 8 tracks |
| provider-late-valid1000 | 1000 | 5288 | accept / 2 tracks |
| provider-valid10000 | 10000 | 1337820 | accept / 8 tracks |
| provider-malformed10000 | 10000 | 130032 | accept / 0 tracks |
| provider-mixed10000 | 10000 | 411976 | accept / 8 tracks |
| provider-late-valid10000 | 10000 | 50292 | accept / 2 tracks |
| client-valid1000 | 1000 | 139798 | reject |
| client-malformed1000 | 1000 | 13012 | reject |
| client-valid10000 | 10000 | 1417800 | reject |
| client-malformed10000 | 10000 | 130012 | reject |

## Reproducibility and Preservation

- inputs.json contains each raw-input SHA-256 plus its explicit expected output; fixture generator is fixtures.mjs. Inputs manifest SHA-256: `50be01b31f585f413392a0b59758087f94052046bb394938b674dda236328c7f`.
- sources/ contains exact measured source copies, source manifests, and lockfiles. preflight.json records source/dependency hashes, Node executable hash, environment, and bundle input hashes. Bundle artifacts/metafiles are in bundles/.
- logs/*-argv.json records exact executable, argv, environment, working directory, timeout, and output limit per process. logs/*.stdout.jsonl and results/*.json retain all observations; stderr logs are retained even when empty.
- summary.json, warm-statistics.csv, first-use-statistics.csv, parity.json, capacity.jsonl, execution.json, and postflight.json provide machine-readable results and preservation checks.
- evidence-index.json enumerates SHA-256 hashes of every artifact except itself; evidence-index.sha256 authenticates that index. The index includes harness, source copies, inputs, invocation records, results, and retained preparation artifacts.
- Postflight verification confirms original exports, installed dependency trees, owner branches/status, the accepted evidence archive/index, and pause files are unchanged. The configured transport guard logged no attempted real transport.

The executable 49eacadc and evidence-only 40b4a5f remain frozen. Independent combined QA acceptance is separate evidence and was not rerun or broadened here. The 12 moderate tooling findings and platform, performance, integration, legal, and release gates remain open as directed. No policy cap, architecture decision, performance threshold, or deployment decision was made.
