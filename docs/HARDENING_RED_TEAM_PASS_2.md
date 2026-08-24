# ARGUS SHOGUN — Hardening Red-Team Pass 2

Branch: `hardening/unified-nutrition-workflow-v2`
PR: #10
Status: **HOLD / DRAFT**

## Audit discipline
Every finding below references behavior that existed on this branch during hardening. No finding is accepted solely because an external model claimed it. The repository behavior, regression test, and CI result are the evidence.

## RT2-001 — Unknown execution role could disappear from state-machine workflow
Severity: HIGH
Status: FIXED

### Failure
`buildNutritionExecutionWorkflow()` originally filtered to known mixable roles. A product with missing/unsupported `mixingRole` could be omitted from the generated workflow rather than stopping execution.

### Fix
- missing `mixingRole` now throws `MISSING_MIXING_ROLE`;
- unsupported roles throw `UNSUPPORTED_EXECUTION_ROLE`;
- pH adjuster remains outside the nutrient-product auto sequence and is handled through the final measurement/correction gate.

### Regression
`scripts/unified-workflow-smoke.ts`

## RT2-002 — Duplicate product identity could create ambiguous repeated execution IDs
Severity: HIGH
Status: FIXED

### Failure
Passing the same product identity twice could create repeated `product:<id>` execution step IDs.

### Fix
State-machine workflow construction rejects duplicate product IDs with `DUPLICATE_EXECUTION_PRODUCT`.

### Regression
`scripts/unified-workflow-smoke.ts`

## RT2-003 — PlannerV3 could bypass Technician conflict logic
Severity: HIGH
Status: CONTAINED / UI STATE-MACHINE INTEGRATION PENDING

### Failure
Technik Żywienia conflict resolution could return HOLD while a manually persisted/custom Planner recipe was still validated mainly for product existence, method and medium.

Potential unsafe cases included:
- additives-only root feed without a base;
- multiple base products;
- custom product without a trusted mixing role.

### Fix / containment
`validateRecipeContext()` now fail-closes on:
- `MISSING_MIXING_ROLE`;
- `MISSING_BASE_NUTRITION`;
- `MULTIPLE_BASE_PRODUCTS`.

Additionally, until PlannerV3 consumes the canonical execution state machine directly, any root-feed recipe containing Silicon returns:
`PRE_BASE_PH_GATE_NOT_INTEGRATED`.

Because PlannerV3 requires zero validation warnings to start, physical execution remains HOLD rather than bypassing the missing pH gate.

### Regression
`scripts/planner-boundary-smoke.ts`

### Remaining work
Replace the temporary Silicon execution lock by wiring `nutritionExecutionStateMachine.ts` into the actual Planner preparation/execution controls. Do not remove the lock before that integration is proven by tests.

## RT2-004 — Invalid DryRun source EC did not always become explicit water-data abstention
Severity: MEDIUM
Status: FIXED

### Failure
Downstream water adjustment was already safe, but a direct `NaN`/Infinity DryRun input was not identical to `undefined` for the explicit `WATER_CHEMISTRY_INCOMPLETE` abstention check.

### Fix
DryRun now normalizes source EC at its boundary and uses the normalized value consistently for water adjustment, CalMag context, conflict resolution and abstention.

### Regression
`scripts/numeric-adversarial-smoke.ts`

## RT2-005 — Invalid environmental numerics could fabricate Light/Standard signal
Severity: MEDIUM
Status: FIXED

### Failure
`Infinity` leaf temperature or invalid RH could satisfy ordinary JavaScript comparisons and create a manufacturer schedule signal.

### Fix
- leaf temperature must be finite;
- RH must be finite and within 0–100;
- independent boolean LED/closed-loop signals remain independent of invalid numeric fields.

### Regression
`scripts/numeric-adversarial-smoke.ts`

## Confirmed architecture invariants
- custom `mixOrder` cannot control physical execution order;
- Technik Żywienia product order and Planner execution order share the canonical role authority;
- Silicon precedes base/Roots when present;
- PRE_BASE_PH_GATE exists as an explicit state-machine gate;
- FINAL_EC_PH_GATE exists as an explicit state-machine gate;
- DryRun cannot become automatic execution authority;
- automatic Planner dispatch remains false;
- persisted custom data cannot gain factory/manufacturer verification authority;
- municipal water reference cannot masquerade as a live source measurement;
- unresolved critical conflicts do not use silent averaging.

## Current release blocker
**P0 remaining:** canonical execution state machine is implemented and tested but is not yet the live control mechanism inside PlannerV3. Legacy Planner execution of Silicon recipes is therefore intentionally HOLD.

## Merge verdict
**NO MERGE. KEEP PR #10 DRAFT.**
