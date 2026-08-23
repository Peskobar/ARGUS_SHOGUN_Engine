# Codex Security Handoff — PR #5

Target PR: `Nutrition Technician v1: Evidence Matrix + decision guardrails`  
Repository: `Peskobar/ARGUS_SHOGUN_Engine`  
Base: `ui/recipe-engine-integration-v1`  
Head: `nutrition/evidence-matrix-v1`

## Why this exists

The Codex Security plugin is best run in a Codex host that exposes the scan runtime. This conversation does not expose the required `start_codex_security_*` / scan-finalization tools, so **no claim is made that an official Codex Security scan has run here**.

This document is a ready-to-use handoff for the diff scan, plus a manual preflight of the security-relevant boundaries.

## Exact diff scope

Review every changed source/config file in PR #5:

- `.github/workflows/ci.yml`
- `package.json`
- `scripts/nutrition-smoke.ts`
- `src/App.tsx`
- `src/NutritionTechnicianPanel.tsx`
- `src/evidenceMatrix.ts`
- `src/nutritionEvidencePolicy.ts`
- `src/nutritionTechnician.ts`

Documentation files are lower-risk but should still be checked for dangerous operational instructions or secrets.

## Threat model

### Assets

- integrity of manufacturer dose data;
- integrity of evidence status / confidence metadata;
- execution ordering and hard agronomic rules;
- local inventory/history state;
- user-entered EC and future pH/recipe data;
- any future import/export payloads.

### Trust boundaries

1. **Hard-coded verified evidence** vs user-created/custom recipes.
2. **UI input** vs decision engine.
3. **Evidence links/content** vs application code.
4. **localStorage persisted state** vs factory defaults/schema migrations.
5. **Planner execution state** vs Nutrition Technician advisory state.
6. **GitHub Actions dependencies** vs repository code.

### Security / integrity properties that must hold

- User input can never silently promote evidence to `VERIFIED`.
- `allowBaseOmit` must require an explicit deliberate path; no implicit truthy coercion.
- Unknown/invalid numeric inputs must not produce NaN/Infinity doses or bypass guards.
- A UI sort/filter operation must not alter the safe physical mixing sequence.
- Source URLs must be treated as data, not executable content.
- User-provided names/notes must remain React-escaped; no raw HTML rendering.
- Future imported JSON must be schema-validated before entering recipe/evidence state.
- localStorage corruption must fail closed, not silently convert malformed values into actionable doses.
- No API key or `.env` secret may be bundled into the client.
- Dependency/workflow changes must not introduce arbitrary install-script execution in CI.

## Manual security preflight of PR #5

This is **not** a Codex Security result.

### Positive observations

- New evidence URLs are static constants and rendered as normal React anchors; there is no `dangerouslySetInnerHTML` in the new UI.
- Background EC input is parsed numerically and rejects negative/non-finite values before entering the decision context.
- BASE omission is fail-closed: it remains blocked unless `allowBaseOmit === true`.
- Unknown water does not silently become HARD/SOFT.
- The new decision engine is advisory and does not directly mutate inventory or history.
- CI installs with `--ignore-scripts`, reducing supply-chain exposure during verification.
- No new runtime network/API dependency was added for the Nutrition Technician.

### Items Codex Security should challenge

1. **Numeric upper bounds**: EC is finite/non-negative but currently has no plausible maximum. Confirm that huge finite values cannot create later arithmetic/DoS or misleading UI states.
2. **Evidence-state privilege**: future Recipe Builder/import flows must not reuse interfaces in a way that allows custom data to claim `MANUFACTURER`/`VERIFIED` without provenance checks.
3. **External link scheme**: current URLs are constants; if they ever become imported/editable, restrict to `https:` before rendering.
4. **localStorage schema**: PR #5 reads existing store data. Verify malformed persisted state cannot poison `currentWaterProfile`, product IDs or recipe objects in supporting code.
5. **History/data integrity**: when Nutrition Technician later writes rationale/history, ensure advisory scenarios cannot be confused with executed doses.
6. **CI supply chain**: pinning GitHub Actions by SHA would be stronger than floating `@v4`; evaluate policy/risk tolerance.
7. **Public-repo privacy**: do not persist private environmental observations, precise location-derived data or user-specific measurements to Git unless intentionally anonymised.

## Codex Security prompt

> Run a security diff scan for PR #5 in `Peskobar/ARGUS_SHOGUN_Engine`, base `ui/recipe-engine-integration-v1`, head `nutrition/evidence-matrix-v1`. Treat agronomic data integrity as a security property: an attacker or malformed persisted/imported value must not promote unverified evidence, bypass BASE omission, alter safe mixing order, inject executable content through evidence metadata, or cause unsafe numeric decisions through NaN/Infinity/extreme values. Review every changed file and follow changed behavior into `store.ts`, `recipeEngine.ts`, `syringeEngine.ts` and `PlannerV3.tsx` only where needed to validate those paths. Distinguish conventional application-security findings from domain-integrity findings. Do not claim agronomic correctness; that is covered by the separate agronomic audit.

## Exit criteria

- zero unresolved HIGH/CRITICAL security findings;
- all changed source files covered;
- explicit verdict on malformed localStorage/import paths;
- explicit verdict on evidence-status privilege boundaries;
- explicit verdict on numeric-input fail-closed behavior;
- explicit coverage statement for execution-order integrity.
