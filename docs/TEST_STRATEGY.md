# Test strategy

The release candidate is verified at four layers:

1. `backend-smoke.mjs` — week routing, execution protocol, mandatory measurements, unverified blocking, unsafe mix order and physical tool graduation.
2. `nutrition-smoke.ts` — evidence preview, WHY/LESS/MORE/OMIT, manufacturer conflicts and dry-run behavior.
3. `nutrition-integrity-smoke.ts` + `work-audit-smoke.ts` — source integrity, audit locks, water provenance and hazard locks.
4. `release-architecture-smoke.ts` — proves the current external profile ABSTAINS and a synthetic fully-authorised evidence envelope can reach PROCEED, proving the architecture is complete rather than permanently locked.

The production build and TypeScript check are required in the same CI run.
