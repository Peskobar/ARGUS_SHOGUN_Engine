# Work Audit Reconciliation — 2026-08-23

External input: `ARGUS_SHOGUN_Evidence_Audit_v2_0_2026-08-23.docx`

This document records how the independent red-team result changes ARGUS. The audit is treated as adversarial review input, not as permission to promote any unresolved number to an executable prescription.

## Adopted executive verdict

| Feature | Audit verdict | ARGUS release state |
|---|---|---|
| WHY / LESS / MORE / OMIT | GO WITH CONDITIONS | Kept as qualitative evidence UI; no numeric MORE/LESS auto-prescription |
| Weekly plan | HOLD | Dry Run only; `readyForExecutionCandidate=false` |
| Automatic dose selection | HOLD | Explicit ABSTAIN/readiness layer added |
| Automatic execution | NO-GO | Nutrition→Planner auto dispatch remains hard false |

## Fundamental architecture correction

Previous shorthand:

`MANUFACTURER DOSE + SCIENCE GUARDRAILS + OBSERVED STATE = DECISION`

Replaced by:

`SOURCE IDENTITY + VERSIONED MANUFACTURER PROFILE + WATER CHEMISTRY + SUBSTRATE IDENTITY/PHYSICS/STATE + ENVIRONMENT/PLANT STATE + INPUT/RUNOFF/ROOT-ZONE HISTORY + MEASUREMENT QUALITY + OBJECTIVE/RISK LIMITS + UNCERTAINTY/CONFLICT POLICY = DECISION OR ABSTAIN`

Implemented in `nutritionDecisionKernel.ts` and `nutritionAuditLock.ts`.

## High-impact findings adopted

### Manufacturer source authority

- Current LED profile exists, but the independent audit does not accept a mirror date as an official SHOGUN version stamp.
- `TERRA_LED_2024` remains an internal compatibility id only.
- Profile is now `PARTIAL`, `snapshotFrozen=false`, `releaseEligible=false`.
- Legacy HARD/SOFT is `OBSOLETE` for current auto-plan authority.
- `manufacturerSnapshot.ts` defines the required frozen snapshot and full generator tuple. Current release snapshot is deliberately `null`.

### Active manufacturer conflicts

- Silicon generic 4 ml/L vs detailed 1 ml/L is an active numeric conflict; generic scraper dose is blocked as authority.
- Katana 5 ml/L soak/propagation vs 0.2 ml/L routine root feed requires METHOD+STAGE+CADENCE.
- PK generic 4 ml/L vs detailed 0.5 ml/L / first-week 1 ml/L requires source-field provenance.
- Start + Grow defaults to XOR until a frozen current calculator profile explicitly proves coexistence.
- PK/Bloom requires `dose_source=standalone_label|integrated_chart` to prevent double reduction.

### Water

- The SHOGUN ~0.4 mS/cm threshold is a manufacturer feed-profile concept, not chemical hardness.
- HARD/SOFT/RO labels cannot create numeric modifiers without live SOURCE_EC.
- CalMag is now `NEEDS_USER_DATA`; EC or a visual symptom cannot auto-create a CalMag dose.
- Added audited 2026 Emmerich reference: EC 0.557 mS/cm, pH 7.46, hardness 12.3 °dH, Ca 75.5 mg/L, Mg 10.4 mg/L, alkalinity 3.11 mmol/L to pH 4.3. It remains reference-only.
- Water model now has Ca/Mg/alkalinity/HCO3/Na/Cl fields and field-level provenance.

### EC ontology and measurement quality

`observedNutritionState.ts` now separates:

- SOURCE_EC
- INPUT_EC_GROSS
- RUNOFF_EC
- POUR_THROUGH_EC
- PORE_WATER_EC
- SUBSTRATE_EC

A raw `rootZoneEc` is legacy/display-only unless a measurement method is known. Measurement envelope supports meter/calibration/timestamp/sampling metadata plus runoff volume/fraction and dryback.

### Symptoms

`nutritionSymptomEngine.ts` is hypothesis-only:

- no diagnosis from a photo/symptom,
- no automatic dose change,
- explicit competing causes,
- high medium EC blocks automatic CalMag MORE.

### Control loop

`nutritionAuditLock.ts` adds:

- explicit `ABSTAIN` reasons,
- READY → PROPOSED → APPLIED → OBSERVE → CONFIRMED / ROLLBACK state machine,
- one-major-change-at-a-time policy,
- undefined max delta/observation window until an evidence/policy source exists (ARGUS does not invent them),
- final EC+pH confirmation as a release prerequisite.

`nutritionObservationHistory.ts` adds comparable irrigation events and refuses to invent the minimum trend sample count.

### Safety / SDS

Execution safety locks added for audit-identified hazards:

- PK Warrior: H314/corrosive lock,
- Silicon: skin/eye irritant lock,
- CalMag: serious eye damage lock.

These remain human-handling/SDS-review interlocks. Automatic dispensing is false.

## Blocker reconciliation B01–B15

| ID | State after reconciliation | Notes |
|---|---|---|
| B01 | OPEN, structurally contained | Snapshot schema exists; actual full current snapshot/generator tuple still missing |
| B02 | OPEN, guarded | PK/Bloom source branch exists; current integrated provenance not fully frozen |
| B03 | OPEN, guarded | Start XOR Grow enforced; current transition still needs frozen calculator evidence |
| B04 | CONTAINED, source conflict remains | Conflicts encoded; generic numeric fields are not authority |
| B05 | CONTAINED | Water labels no longer act as chemical-hardness measurements |
| B06 | IMPLEMENTED | EC ontology separated |
| B07 | IMPLEMENTED IN MODEL | measurement method/quality envelope added; UI capture remains future work |
| B08 | IMPLEMENTED IN MODEL / DATA NEEDED | water chemistry fields exist; live/user context still needed |
| B09 | PARTIAL | medium identity/charge/perlite/pot model added; actual user medium data needed |
| B10 | PARTIAL | irrigation/runoff/dryback fields/history model added; actual events needed |
| B11 | OPEN BY POLICY | trend history exists but minimum comparable sample count remains intentionally undefined |
| B12 | OPEN BY POLICY | lifecycle/rollback structure exists; numeric max delta/window intentionally undefined |
| B13 | IMPLEMENTED | explicit ABSTAIN + reason + minimum next measurement |
| B14 | PARTIAL/IMPLEMENTED GUARD | symptom engine separates hypotheses/lockout; full diagnostic physiology remains out of scope |
| B15 | IMPLEMENTED AS GATE | final EC+pH prerequisite exists in readiness kernel; UI capture/integration still required |

## Current release lock

- Evidence explanation: **GO WITH CONDITIONS**
- Manufacturer-number preview: **DRY RUN ONLY**
- Weekly prescription authority: **HOLD**
- Adaptive dose optimisation: **HOLD**
- Nutrition-generated automatic physical execution: **NO-GO**
- Existing Planner 2.2 remains a separate human-operated execution tool and is not silently fed by Nutrition Technician.

## Next legitimate unlocks

1. Freeze a complete current SHOGUN LED/generator snapshot with source identity/hash/full tuple.
2. Resolve current integrated PK/Bloom provenance and Start→Grow transition.
3. Capture actual medium identity/initial charge/perlite ratio.
4. Capture live source EC+pH and retain current municipal chemistry as reference.
5. Define measurement protocol and collect repeatable irrigation/root-zone trends.
6. Define change-control max delta, observation window, STOP and rollback criteria from an explicit project policy/evidence source.
7. Run the official Codex Security diff scan in a Codex host.
8. Only then reconsider weekly-plan authority. Automatic physical dispatch remains a separate future safety decision.
