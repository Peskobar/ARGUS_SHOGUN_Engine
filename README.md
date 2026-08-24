# ARGUS SHOGUN Engine

Evidence-aware execution and nutrition decision system.

## Release architecture

ARGUS separates three authorities:

1. **Evidence / Nutrition Technician** — explains WHY / LESS / MORE / OMIT and returns `PROCEED` or `ABSTAIN`.
2. **Execution Policy** — validates exact context, recipe authority, protocol confirmations, measurements, inventory and physical tool measurability.
3. **Store transaction** — the only code path allowed to mutate inventory and audit history.

The physical path is:

`ExecutionPlanner -> evaluateExecutionReadiness() -> executeRecipe()`

Legacy Planner, PlannerV2 and PlannerV3 execution paths are not part of the release architecture.

## Fail-closed rules

Physical execution requires:

- exact medium / method / stage / week match,
- `VERIFIED` recipe status,
- `PHYSICAL_ALLOWED` execution policy,
- safe mixing-role order,
- confirmation of every protocol step,
- mandatory PRE-BASE pH gate after Silicon,
- mandatory final EC and pH values,
- sufficient inventory,
- a finite exact syringe/pipette allocation that respects real graduation steps.

Factory placeholder recipes remain `UNVERIFIED / SIMULATION_ONLY` until an evidence audit explicitly promotes them.

## Nutrition Technician

The Nutrition UI is wired directly to the Decision Kernel. It collects water chemistry, medium identity, measurement method/quality, comparable observation history, change-control policy, objective/risk and human approval.

Missing or conflicting evidence produces `ABSTAIN`; the system does not fabricate a dose or silently promote a municipal/reference value to a live measurement.

The current manufacturer profile remains fail-closed while its reproducible frozen snapshot and source conflicts are unresolved.

## Commands

Requires Node.js 22+.

```sh
npm install
npm run dev
```

Full verification:

```sh
npm run check
```

It runs TypeScript, backend smoke, Nutrition smoke, Nutrition integrity, independent-audit checks, release-architecture regression tests and the production build.

See `docs/RELEASE_ARCHITECTURE_V1.md` for the architecture lock.
