# Codex Security Handoff — PR #5

Target PR: `Nutrition Technician v1: Evidence Matrix + decision guardrails`  
Repository: `Peskobar/ARGUS_SHOGUN_Engine`  
Base: `ui/recipe-engine-integration-v1`  
Head: `nutrition/evidence-matrix-v1`

## Why this exists

The Codex Security plugin is best run in a Codex host that exposes the scan runtime. This conversation does not expose the required `start_codex_security_*` / scan-finalization tools, so **no claim is made that an official Codex Security scan has run here**.

This document is a ready-to-use handoff for the diff scan, plus a manual preflight of security and domain-integrity boundaries.

## Exact diff scope

Review every changed source/config file in PR #5, including at minimum:

- `.github/workflows/ci.yml`
- `package.json`
- `scripts/nutrition-smoke.ts`
- `src/App.tsx`
- `src/NutritionTechnicianPanel.tsx`
- `src/dryRunNutritionPlan.ts`
- `src/evidenceMatrix.ts`
- `src/manufacturerProfiles.ts`
- `src/nutritionConflictResolver.ts`
- `src/nutritionEvidencePolicy.ts`
- `src/nutritionExecutionBridge.ts`
- `src/nutritionTechnician.ts`
- `src/store.ts`
- `src/supplementalEvidence.ts`

Documentation should also be checked for secrets, misleading release claims and unsafe operational claims.

## Threat model

### Assets

- integrity of manufacturer dose/profile data;
- integrity of provenance, evidence status and confidence metadata;
- execution ordering and hard agronomic rules;
- local inventory/history state;
- user-entered EC and future pH/recipe data;
- release-gate state between Nutrition Technician and Planner 2.2;
- any future import/export payloads.

### Trust boundaries

1. Hard-coded manufacturer evidence vs user-created/custom recipes.
2. UI input vs decision engine.
3. Evidence/source URLs vs application code.
4. localStorage persisted state vs factory defaults/schema migrations.
5. Nutrition advisory/dry-run state vs Planner physical execution state.
6. External audit result vs repository evidence/provenance.
7. GitHub Actions dependencies vs repository code.

### Security / integrity properties that must hold

- User/persisted data can never silently promote evidence or recipes to `VERIFIED`/manufacturer authority.
- `allowBaseOmit` requires exact `=== true`; no implicit truthy coercion.
- Unknown/invalid numeric input must not produce NaN/Infinity actionable doses or bypass guards.
- A declared HARD/SOFT water label must not silently trigger a numeric LED water modifier when measured EC is absent.
- LED and legacy manufacturer profiles must not be silently merged.
- An unresolved conflict must not disappear merely because a dry-run object is transformed into an execution handoff.
- `automaticPlannerDispatchAllowed` remains false in v1 even if all review gates are marked PASS.
- A UI sort/filter operation must not alter the physical safe mix order.
- Source URLs are data, never executable content.
- User-provided names/notes remain React-escaped; no raw HTML rendering.
- Future imported JSON is schema-validated before entering recipe/evidence state.
- localStorage corruption fails closed rather than converting malformed values into actionable doses.
- No client bundle contains API keys or private `.env` values.
- CI dependency installation does not execute arbitrary package install scripts.

## Manual preflight after provenance/bridge pass

This section is **not** an official Codex Security scan.

### Positive observations

- Manufacturer profiles and source registry are static source-controlled data.
- The LED water resolver now applies numeric percentage modifiers only from measured finite EC at explicit manufacturer anchors/ranges. Water labels alone do not change Terra base dose.
- Between-anchor EC values are not interpolated.
- Water percentage modifiers apply only to Terra base products, not blindly to every additive.
- `DryRunNutritionPlan` does not mutate inventory/history or invoke Planner execution.
- `NutritionExecutionHandoff` is a boundary object only. It cannot dispatch to Planner and hardcodes `automaticPlannerDispatchAllowed: false`.
- Pending agronomic/security/source-reconciliation gates all create HOLD blockers.
- Grow + Bloom is an explicit BLOCK conflict.
- BASE omission is fail-closed unless `allowBaseOmit === true`.
- Evidence URLs are constants rendered through normal React anchors; no `dangerouslySetInnerHTML` is used by the new UI.
- UI EC is bounded to 0–20 mS/cm before entering the Nutrition context.
- `store.ts` v3 validates persisted enums/numbers, restores only mutable stock values for factory products, sanitizes custom recipes/history, and forces persisted custom recipes to `UNVERIFIED`.
- CI uses `npm install --ignore-scripts --no-audit --no-fund` during verification.
- No new runtime remote API call was introduced by Nutrition Technician.

### Items Codex Security should challenge

1. **Runtime API boundaries**: core TypeScript functions can be imported outside the controlled UI. Verify impossible stage/week/extreme numeric calls remain fail-closed and cannot later become an unsafe execution path.
2. **Evidence-state privilege**: ensure no future builder/import route can create source-controlled/manufacturer authority through public interfaces.
3. **External link scheme**: current source URLs are constants. If editable/imported evidence is ever supported, enforce `https:` before rendering.
4. **Audit gate authenticity**: future code must not accept arbitrary localStorage/imported strings as proof that agronomic/security reconciliation passed.
5. **History semantics**: advisory, simulated, approved and physically executed doses must be distinguishable once the bridge writes history.
6. **Execution ordering**: when handoff wiring is implemented, verify no UI/product sort can replace `mixOrder`/role ordering.
7. **CI supply chain**: evaluate pinning GitHub Actions to immutable SHAs instead of floating major tags.
8. **Privacy**: measurements and environment history should remain local unless the user explicitly exports/syncs them; do not commit personal observations to the public repository.

## Codex Security prompt

> Run a security diff scan for PR #5 in `Peskobar/ARGUS_SHOGUN_Engine`, base `ui/recipe-engine-integration-v1`, head `nutrition/evidence-matrix-v1`. Treat agronomic data integrity as a security property. A malicious or malformed persisted/imported value must not promote unverified evidence, select manufacturer authority, bypass BASE omission, erase a nutrition conflict, alter safe mixing order, trigger an LED water modifier without valid measured EC, forge release-gate PASS state, inject executable content through evidence metadata, or cause unsafe numeric decisions through NaN/Infinity/extreme values. Review every changed file and follow changed behavior into `recipeEngine.ts`, `syringeEngine.ts` and `PlannerV2.tsx` only where needed. Distinguish conventional application-security findings from domain-integrity findings. Do not claim agronomic correctness; that is covered by the independent agronomic audit.

## Exit criteria

- zero unresolved HIGH/CRITICAL security findings;
- all changed source files covered;
- explicit verdict on malformed localStorage/import paths;
- explicit verdict on evidence/profile privilege boundaries;
- explicit verdict on numeric-input fail-closed behavior;
- explicit verdict on release-gate authenticity;
- explicit coverage statement for execution-order integrity.
