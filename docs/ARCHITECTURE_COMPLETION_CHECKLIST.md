# Architecture Completion Checklist

## Execution-path red team

- [x] UNVERIFIED recipes are simulation-only for physical execution.
- [x] Physical execution additionally requires explicit `PHYSICAL_ALLOWED` authority.
- [x] PRE-BASE pH is a mandatory measured gate after Silicon.
- [x] Final EC and final pH are mandatory measured gates.
- [x] Recipe selection is week-aware.
- [x] Legacy Planner / PlannerV2 / PlannerV3 execution paths are removed from release architecture.
- [x] Nutrition UI is wired directly to Decision Kernel / ABSTAIN.
- [x] Custom `mixOrder` is subordinate to safe role-sequence validation.
- [x] Execution history records provenance, context, measurements, tools and confirmed steps.
- [x] Syringe/pipette graduation is a hard measurability constraint.
- [x] Persisted factory inventory is clamped to factory capacity.
- [x] Factory/custom execution authority cannot be promoted from localStorage.

## Nutrition architecture

- [x] WHY / LESS / MORE / OMIT remains explanatory and evidence-labelled.
- [x] Manufacturer snapshot authority is a hard kernel gate.
- [x] Manufacturer conflicts are surfaced and prevent adaptive authority.
- [x] Municipal water chemistry remains reference-only for adaptive decisions.
- [x] Live critical water chemistry is required for adaptive CalMag authority.
- [x] Medium identity and initial charge have explicit gates.
- [x] EC measurement semantics remain separated by method.
- [x] Measurement quality metadata is captured by the UI.
- [x] Trend uses only comparable observations and requires explicit minimum sample policy.
- [x] Change-control values are explicit user/project policy inputs; no invented numeric defaults.
- [x] Physiological lockout exclusion is explicit.
- [x] Human approval is explicit.
- [x] External evidence/data gaps produce ABSTAIN rather than fabricated numbers.

## External data gates

External evidence is intentionally not marked complete by software. See `EXTERNAL_EVIDENCE_GATE.md`.
