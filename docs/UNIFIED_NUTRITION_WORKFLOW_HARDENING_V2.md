# ARGUS SHOGUN — Unified Nutrition Workflow Hardening v2

Status: ACTIVE HARDENING PLAN
Base: `nutrition/evidence-matrix-v1`
Branch: `hardening/unified-nutrition-workflow-v2`
Merge policy: NO MERGE until all release gates pass.

## Architectural decision
Nutrition Technician and Planner are one user workflow, but remain separated internally into domain engines. Nutrition Technician owns evidence/readiness/decision. Planner capabilities become the preparation/execution workflow beneath the same module. There must be one source of truth for physical mixing order.

## Target user workflow
`DIAGNOSIS -> DECISION -> RECIPE -> PREPARATION -> VERIFICATION -> HISTORY`

## Internal boundaries
- Evidence / provenance
- Decision kernel
- Conflict resolver
- Recipe engine
- Canonical mixing sequence engine
- Syringe/tool allocation engine
- Execution state machine
- Measurement verification
- Observation/history

No UI component is allowed to become an authority for chemistry, provenance, or execution safety.

# P0 — ARCHITECTURE AND PHYSICAL SEQUENCE

## P0.1 Canonical mixing sequence
Create one canonical execution-order authority shared by Technician and Planner.

Required process model:
`WATER -> SILICON -> MIX_DILUTION -> PRE_BASE_PH_GATE -> CALMAG -> BASE -> ROOTS -> ENZYME -> BOOSTER -> PK -> FINAL_MIX -> FINAL_EC_PH_GATE -> COMPLETE`

Notes:
- Product presence is recipe-dependent; process gates are domain-dependent.
- A UI list/order is never an execution authority.
- Technician must not maintain a second local product sequence.

Acceptance:
- Same recipe produces the same execution sequence in every UI/module.
- Silicon cannot be moved behind BASE/ROOTS/ENZYME/BOOSTER/PK by UI or persisted custom data.
- ROOTS/Katana cannot precede Silicon when Silicon is present.

## P0.2 Separate order concepts
Introduce explicit separation:
- `displayOrder`: cosmetic UI only.
- `recipeOrder`: recipe authoring/presentation metadata.
- `executionOrder`: derived only from canonical domain rules.

Persisted/custom `mixOrder` must not override chemical safety order.

## P0.3 Mandatory process gates
Promote PRE_BASE_PH_GATE and FINAL_EC_PH_GATE from explanatory text into execution-state-machine steps.

Acceptance:
- Required gate cannot be skipped.
- A blocked/unknown gate cannot transition to the next execution state.
- Gate state is explicit and testable.

## P0.4 Technician + Planner convergence
Remove duplicate local ordering/recipe execution logic from Nutrition Technician UI. Both surfaces consume the same canonical recipe/execution model.

Do NOT create a monolithic component. Preserve independent engines.

# P1 — FAIL-CLOSED HARDENING

## P1.1 Numeric adversarial boundary suite
Test and reject/ABSTAIN/HOLD as appropriate:
- NaN
- Infinity
- -Infinity
- null
- undefined
- numeric strings
- negative values
- physically impossible/extreme values
- boundary values including EC 0.0

No unsafe value may reach arithmetic/decision code through implicit coercion.

## P1.2 localStorage poisoning suite
Attempt to inject/override:
- `verificationStatus: VERIFIED`
- manufacturer/factory authority
- `isFactory`
- mixing metadata/order
- product metadata
- unsafe concentrations
- malformed history

Acceptance:
- Factory authority comes only from trusted in-code registry/data.
- Persisted custom recipes remain UNVERIFIED and non-factory.
- Persisted state cannot override canonical execution safety metadata.

## P1.3 Water provenance suite
Cases:
- no live source EC
- live EC = 0.0
- live EC = 0.40
- municipal/local reference only
- RO declared without live measurement
- invalid EC/pH
- missing Ca/Mg/buffer context

Acceptance:
- Reference values never masquerade as live measurement.
- Reference EC cannot unlock adaptive dose modification.
- Adaptive CalMag remains ABSTAIN unless its evidence requirements are satisfied.

## P1.4 Conflict regression suite
Cover at minimum:
- Silicon generic 4 vs detailed 1 ml/L context conflict
- Katana routine 0.2 vs propagation/soak 5 ml/L
- Start + Terra Grow overlap
- Grow + Bloom
- Bloom + PK provenance/context
- missing base with additives only
- requested +25% CalMag under unsafe/unknown context

Acceptance:
- No silent averaging.
- Unresolved critical conflicts produce HOLD/ABSTAIN.
- Method/stage/cadence/source remain part of dose identity.

## P1.5 DryRun / execution isolation
Prove contractually that DryRun cannot become execution authority.

Acceptance:
- DryRun remains `mode=DRY_RUN`.
- `readyForExecutionCandidate=false` remains enforced while Work audit holds weekly prescription.
- `automaticExecutionAllowed=false` and `automaticPlannerDispatchAllowed=false` are invariants.
- No store/UI route can promote DryRun by structural similarity alone.

## P1.6 Human-in-the-loop and audit locks
End-to-end tests must prove that HOLD, ABSTAIN, unresolved provenance, failed gates, or missing human approval prevent execution promotion.

# P2 — UNIFIED UX

One Nutrition Technician workflow:
1. DIAGNOSIS — context, water, medium, observations, measurement quality.
2. DECISION — WHY / LESS / MORE / OMIT, conflicts, provenance, uncertainty, HOLD/ABSTAIN.
3. RECIPE — candidate recipe and source identity.
4. PREPARATION — volume, ml/L, total ml, syringe/tool allocation, canonical execution sequence.
5. VERIFICATION — required process gates, final EC/pH, operator confirmation.
6. HISTORY — record what was actually prepared/applied and observations.

Planner functionality remains, but as PREPARATION/EXECUTION inside Nutrition Technician rather than a second decision authority.

# P3 — CI AND EVIDENCE

CI must include:
- build
- strict TypeScript/typecheck
- unit tests
- canonical sequence invariants
- adversarial numeric tests
- storage/provenance poisoning tests
- water provenance tests
- conflict tests
- workflow integration/E2E tests where available

A green smoke test alone is not release evidence.

# P4 — RED TEAM RE-AUDIT

Every finding in the final re-audit must include:
- exact commit SHA
- real file path
- real function/symbol
- reproducible failure path
- failing test/reproduction before fix where feasible
- passing regression after fix
- confidence grounded in repository evidence

Reject findings that cite nonexistent code or unverifiable paths.

# RELEASE GATES

PR/branch cannot be promoted until all are PASS:
1. Architecture invariants
2. Canonical sequence
3. Mandatory process gates
4. Numeric fail-closed
5. Storage/provenance isolation
6. Water live/reference isolation
7. Conflict policy
8. DryRun/execution isolation
9. Human-in-the-loop boundary
10. Workflow tests
11. CI
12. Independent red-team re-audit

# NON-NEGOTIABLE LOCKS

- NO automatic execution.
- NO silent averaging of conflicting doses.
- NO manufacturer authority from localStorage/custom JSON.
- NO reference water represented as live measurement.
- NO UI sorting/reordering affecting execution order.
- NO custom `mixOrder` overriding chemical safety.
- NO merge before hardening + re-audit.
