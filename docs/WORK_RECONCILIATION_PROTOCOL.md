# ARGUS SHOGUN — Work Audit Reconciliation Protocol

Purpose: consume the independent GPT-5.6 Work / agronomic red-team report without allowing prose quality, confidence language or source-count inflation to overwrite repository evidence.

## Rule 0 — Work is an auditor, not an authority

The incoming report is evidence to reconcile. It does not directly edit manufacturer profiles, product doses, conflict rules or execution recipes.

Every claim that can change an operational decision must be mapped to a repository claim and classified independently.

## Reconciliation statuses

- `MATCH`: Work independently reproduces the repository claim from compatible primary evidence.
- `STRONGER_EVIDENCE`: Work supplies a better/current primary source that supports the same claim.
- `CONFLICT`: Work supplies credible evidence incompatible with the repository claim.
- `UNSUPPORTED_WORK`: Work claim cannot be traced to an acceptable source/context.
- `UNSUPPORTED_ARGUS`: repository claim cannot survive the independent check.
- `CONTEXT_MISMATCH`: both claims can be true but refer to different profile, medium, water class, method, stage/week or document version.
- `NEEDS_USER_DATA`: resolution depends on observed state such as live water EC/pH, substrate/perlite ratio, runoff or environment.

## Claim key

Each reconciliation row must identify:

`productId | manufacturerProfile | stage | week/window | method | cadence | water context | claimed value/rule | source`

A numeric claim without this context cannot become an operational override.

## Mandatory checks for numeric disagreements

When Work and ARGUS differ on ml/L, EC, pH, percentage or week:

1. Confirm both units and normalization, especially `mL/10 L` versus `mL/L`.
2. Confirm profile identity: LED, legacy hard/soft, autoflower or standalone product page.
3. Confirm whether the value is an integrated feedchart value or standalone rate.
4. Confirm stage/week columns and blank cells.
5. Confirm water assumptions.
6. Confirm root-feed versus foliar/soak application.
7. Confirm cadence: once, weekly, every feed or window-only.
8. Prefer a current manufacturer primary source over a mirror when both expose the same document; keep the mirror only as extraction provenance.

## Automatic HOLD triggers

Any of the following changes the affected operational claim to `CONFLICT` and blocks its use by AUTO PLAN:

- numeric disagreement that cannot be explained by profile/version/context,
- different mixing/process order with safety implications,
- conflicting Silicon pH-gate instructions,
- conflicting Start → Terra Grow transition,
- unresolved PK Warrior / Bloom double-adjustment provenance,
- CalMag rule inconsistent with the active water profile,
- evidence that a feedchart treated as current has been superseded,
- evidence that a special protocol was encoded as every-feed dosing,
- peer-reviewed result being used beyond its medium/system transferability.

## Evidence priority during reconciliation

1. Current official SHOGUN primary document/page for product instructions and manufacturer schedules.
2. Versioned official manufacturer PDF or chart.
3. SDS only for what it actually discloses; never infer a guaranteed complete formula from hazard ranges.
4. Direct peer-reviewed Cannabis evidence for science guardrails.
5. Transfer-limited Cannabis evidence from a different cultivation system.
6. General plant physiology.
7. Local-water utility data.
8. User measurement for actual local observed state. User measurement outranks utility averages for that user's water at that time.

Manufacturer instructions and scientific guardrails answer different questions and must not be collapsed into one ranking.

## Reconciliation output required before AUTO PLAN

Create a table with:

- claim key,
- ARGUS value/rule,
- Work value/rule,
- ARGUS source,
- Work source,
- status,
- resolution,
- code/data files affected,
- gate: `GO` / `HOLD`.

Then update:

- `SOURCE_REGISTRY_V1.md`,
- manufacturer profile data,
- Evidence Matrix,
- conflict resolver,
- smoke tests,
- audit findings.

No code or dose change is accepted merely because Work phrases it more confidently.

## Release condition

The independent Work report can move Nutrition Technician closer to `AUTO PLAN = GO` only after all HIGH-impact rows are `MATCH`, `STRONGER_EVIDENCE`, or explicitly resolved `CONTEXT_MISMATCH`.

Any unresolved HIGH-impact `CONFLICT` keeps the corresponding feature on HOLD.
