# Codex Security Handoff — PR #5

Target PR: `Nutrition Technician v1: Evidence Matrix + decision guardrails`  
Repository: `Peskobar/ARGUS_SHOGUN_Engine`  
Base: `ui/recipe-engine-integration-v1`  
Head: `nutrition/evidence-matrix-v1`

## Current external-audit state

Independent Work red-team audit dated 23.08.2026 has been reconciled into the branch.

Audit verdict now encoded in source:

- WHY / LESS / MORE / OMIT: `GO_WITH_CONDITIONS`
- weekly plan: `HOLD`
- automatic dose selection: `HOLD`
- automatic execution: `NO_GO`

This document is a handoff only. No claim is made that an official Codex Security scan has run in this chat host.

## Required diff scope

Review all PR #5 changed files, especially:

- `.github/workflows/ci.yml`
- `package.json`
- `scripts/nutrition-smoke.ts`
- `scripts/nutrition-integrity-smoke.ts`
- `scripts/work-audit-smoke.ts`
- `src/App.tsx`
- `src/NutritionTechnicianPanel.tsx`
- `src/dryRunNutritionPlan.ts`
- `src/evidenceMatrix.ts`
- `src/localWaterReference.ts`
- `src/manufacturerProfiles.ts`
- `src/manufacturerSnapshot.ts`
- `src/mediumState.ts`
- `src/nutritionAuditLock.ts`
- `src/nutritionConflictResolver.ts`
- `src/nutritionDecisionKernel.ts`
- `src/nutritionEvidencePolicy.ts`
- `src/nutritionExecutionBridge.ts`
- `src/nutritionObservationHistory.ts`
- `src/nutritionSymptomEngine.ts`
- `src/nutritionTechnician.ts`
- `src/observedNutritionState.ts`
- `src/store.ts`
- `src/supplementalEvidence.ts`
- `src/waterChemistry.ts`

## Security/domain-integrity assets

- manufacturer profile/source identity and frozen-snapshot authority;
- dose method/stage/cadence provenance;
- evidence status/confidence privilege boundary;
- ABSTAIN and release-gate integrity;
- safe physical mixing order and Silicon pH gates;
- water/EC measurement semantics;
- local inventory/history and user observations;
- distinction between preview, proposal, applied event and confirmed outcome;
- SDS hazard locks and human handling requirements.

## Properties that must hold

1. User/persisted/imported data cannot promote itself to manufacturer/VERIFIED authority.
2. A partial/unfrozen manufacturer profile cannot become weekly-plan release authority.
3. Legacy HARD/SOFT cannot silently merge with the current LED profile.
4. HARD/SOFT/RO label alone cannot create a numeric water modifier.
5. CalMag cannot be auto-added from EC or a visual symptom alone.
6. Generic manufacturer `dose` fields cannot override METHOD+STAGE+CADENCE+SOURCE-specific instructions.
7. Start+Grow conflict cannot disappear in object transformations.
8. PK/Bloom cannot receive an accidental second 25–50% reduction.
9. NaN/Infinity/extreme malformed values fail closed.
10. Generic `rootZoneEc` without measurement method cannot become decision-grade data.
11. A single symptom/photo cannot create a nutrient diagnosis or dose change.
12. Release-gate PASS state cannot be forged from localStorage/import payloads.
13. `automaticPlannerDispatchAllowed` stays false.
14. Work audit `automaticExecution=NO_GO` cannot be bypassed by setting all software gates PASS.
15. UI sorting/filtering cannot replace physical `mixOrder` / process gates.
16. User observations/history remain private/local unless explicitly exported/synced.
17. No secrets/API keys are bundled into the client.

## Manual preflight observations

This is not an official Codex finding set.

Positive controls currently present:

- `manufacturerSnapshot.ts` has no release snapshot; current value is deliberately null.
- LED profile is `PARTIAL`, `snapshotFrozen=false`, `releaseEligible=false`.
- Legacy profile is `OBSOLETE` for current auto-plan authority.
- `DryRunNutritionPlan.readyForExecutionCandidate` is hard false after the independent audit.
- Nutrition execution bridge always carries automatic execution `NO_GO` and Planner auto-dispatch false.
- explicit ABSTAIN reasons exist.
- measurement ontology separates source/input/runoff/pour-through/pore-water/substrate EC.
- measurement-quality and runoff-fraction metadata are modelled.
- symptom engine is hypothesis-only and cannot change dose.
- lifecycle transition helper prevents arbitrary READY→CONFIRMED jumps.
- change-control max delta and observation window remain undefined rather than being invented.
- SDS hazard locks mark PK Warrior H314, Silicon skin/eye irritation and CalMag serious-eye-damage handling as human/SDS-review paths.
- CI uses `npm install --ignore-scripts` and runs backend, nutrition, integrity and Work-audit smoke suites.

## Items Codex Security should attack

1. Can custom/persisted data forge `snapshotFrozen`, `releaseEligible`, source authority or audit gate PASS?
2. Can a caller bypass UI bounds by importing core functions with pathological finite numbers?
3. Can a malformed object erase an ABSTAIN reason or conflict during Nutrition→Planner transformation?
4. Can product ids or method fields be confused to turn Katana soak 5 ml/L into routine root feed?
5. Can generic source metadata inject a `javascript:`/unsafe URL if evidence becomes user-editable later?
6. Can lifecycle/history state be replayed or reordered to make a PROPOSED event look CONFIRMED?
7. Can localStorage corruption poison currentWaterProfile, custom recipes, history, audit state or source identity?
8. Can execution ordering be changed by UI sorting or arbitrary `mixOrder` mutation?
9. Can future automation bypass SDS/human-handling interlocks?
10. Evaluate GitHub Action tag pinning and dependency supply-chain exposure.

## Codex Security prompt

> Run a security diff scan for PR #5 in `Peskobar/ARGUS_SHOGUN_Engine`, base `ui/recipe-engine-integration-v1`, head `nutrition/evidence-matrix-v1`. Treat agronomic data integrity and release-gate integrity as security properties. The independent red-team verdict is WHY/LESS/MORE/OMIT GO WITH CONDITIONS, WEEKLY PLAN HOLD, automatic dose HOLD, automatic execution NO-GO. Attempt to bypass those locks through malformed/localStorage/imported state, profile privilege forgery, numeric edge cases, method/stage confusion, conflict erasure, lifecycle replay and Nutrition→Planner transformations. Explicitly test manufacturer snapshot authority, Katana method separation, PK/Bloom provenance, Silicon pH process ordering, CalMag abstention, EC measurement-method semantics and SDS/human-handling interlocks. Distinguish conventional application-security findings from domain-integrity findings. Do not claim agronomic correctness.

## Exit criteria

- zero unresolved HIGH/CRITICAL security findings;
- every changed source/config file covered or explicitly excluded with reason;
- explicit verdict on localStorage/import privilege boundaries;
- explicit verdict on frozen manufacturer-snapshot authority;
- explicit verdict on ABSTAIN/release-gate bypass resistance;
- explicit verdict on numeric fail-closed behavior;
- explicit verdict on lifecycle/history integrity;
- explicit coverage statement for physical execution-order and SDS interlocks.
