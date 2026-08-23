# ARGUS SHOGUN Engine

Operator-facing planner for preparing SHOGUN nutrient recipes with explicit execution order, finite syringe/pipette allocation and Reality Lock validation.

## Status

This repository separates **execution logic** from **recipe evidence**.

- The execution engine is responsible for ordering steps, validating context, checking physical tools and preventing impossible operations.
- Factory recipe doses are currently marked `UNVERIFIED` and must not be treated as evidence-verified merely because the application can calculate them.
- A recipe marked `CONFLICT` is blocked from execution until its source conflict is resolved.

## Reality Lock rules

For root-feed recipes the engine models process checkpoints, not only a flat ingredient list:

1. start from measured base water,
2. add Silicon according to the recipe,
3. mix and perform the post-Silicon pH checkpoint,
4. continue with the remaining products in the engine/recipe order,
5. measure final EC,
6. perform the final pH check.

Concentrated products are represented as additions to water, not as concentrates to be premixed together.

A custom recipe can override product order with `mixOrder`. The post-Silicon pH checkpoint is inserted relative to the actual sorted execution sequence, so it cannot accidentally move in front of Silicon.

## Architecture

- `src/recipeEngine.ts` — strict recipe filtering, execution order/protocol, validation and inventory-shortage checks.
- `src/syringeEngine.ts` — finite physical syringe/pipette allocation. One physical tool instance cannot be assigned to multiple products in one prepared set.
- `src/store.ts` — local persisted state and atomic execution of inventory + history changes.
- `src/data.ts` — product catalog and factory recipes. Factory doses remain `UNVERIFIED` until the evidence audit is complete.
- `src/App.tsx` — UI wired to the domain engines. It does not maintain a competing copy of execution rules.
- `scripts/backend-smoke.mjs` — regression tests for filtering, ordering, pH checkpoint placement, finite tools, validation and stock shortages.

## Local development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Run the complete local check:

```sh
npm run check
```

That runs TypeScript checking, backend smoke tests and the production build.

## Safety properties

The UI blocks execution when:

- recipe validation reports an error,
- the recipe has `CONFLICT` status,
- available inventory is lower than the calculated requirement,
- the physical syringe/pipette set cannot cover all required doses without reusing an assigned tool.

`UNVERIFIED` is surfaced as a warning rather than silently presented as verified data.

## Data policy

Do not silently change factory doses to make tests pass. Dose values, application claims and source metadata should be changed only through an evidence-first audit with traceable sources.
