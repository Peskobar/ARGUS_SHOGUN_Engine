# ARGUS SHOGUN — Release Architecture v1

## Status goal

This release removes parallel execution paths and makes physical execution fail-closed.

## Single execution authority

Physical inventory mutation is permitted only through:

`ExecutionPlanner -> executionPolicy.evaluateExecutionReadiness -> store.executeRecipe`

There is no Legacy Planner, PlannerV2 or PlannerV3 execution path in the release architecture.

## Physical execution gates

A recipe may physically execute only when all are true:

1. exact medium / method / stage / week match,
2. `verificationStatus = VERIFIED`,
3. `executionPolicy = PHYSICAL_ALLOWED`,
4. recipe validation has no error,
5. safe ROOT_FEED role order is preserved even when `mixOrder` exists,
6. every protocol step is explicitly confirmed,
7. Silicon recipes pass the PRE-BASE pH gate with a real pH value below 7,
8. final EC is entered,
9. final pH is entered,
10. stock is sufficient,
11. every requested liquid amount can be measured by the finite physical syringe/pipette set at its real graduation step.

Factory placeholder recipes remain `UNVERIFIED / SIMULATION_ONLY` until an evidence audit explicitly promotes them.

## Nutrition Technician authority

Nutrition Technician is an evidence and decision layer. It cannot dispatch directly into inventory mutation.

The visible UI calls the Decision Kernel and exposes either:

`PROCEED`

or

`ABSTAIN + reason + minimum next measurement`

The kernel requires manufacturer snapshot authority, conflict resolution, live water chemistry where adaptive chemistry is needed, medium identity, measurement method/quality, repeatable comparable trend, explicit change-control policy, physiological-lockout exclusion, final solution confirmation, software release gate and human approval.

External evidence absence is represented as ABSTAIN, never as fabricated data.

## Data provenance

Municipal water chemistry is reference context only. It cannot satisfy live adaptive CalMag chemistry gates.

SOURCE EC, INPUT EC, RUNOFF EC, substrate EC and other root-zone methods remain separate measurement semantics.

## Audit history

Successful physical execution stores stage/week/context, recipe verification and execution authority, source metadata, PRE-BASE/final measurements, physical tool instances and graduation, confirmed protocol steps, lifecycle state and approval state together with inventory mutation.

## Custom recipes

Custom recipes are always persisted as:

- `UNVERIFIED`
- `SIMULATION_ONLY`

The user-facing builder cannot grant physical authority. Manual order is validated by the safe sequence policy.

## External promotion gate

The architecture is complete without pretending external source work is complete. Current manufacturer profiles remain fail-closed until a reproducible frozen snapshot and source conflicts are resolved. Promotion is a data/evidence event, not a UI shortcut.
