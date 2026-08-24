# External Evidence Gate

The software architecture is designed to be release-ready without pretending external evidence exists.

These items cannot be completed by code alone and therefore remain explicit fail-closed data gates:

- reproducible frozen current SHOGUN LED/generator snapshot,
- reconciliation of active manufacturer numeric conflicts,
- current integrated Bloom/PK provenance,
- current Start-to-Grow transition provenance,
- live user water chemistry for adaptive chemistry decisions,
- actual medium identity and initial-charge data,
- measured observation history collected with a repeatable method.

Until the relevant gate is satisfied, the Nutrition Decision Kernel returns `ABSTAIN` and factory placeholder recipes remain `SIMULATION_ONLY`.

Promotion requires evidence/data input. It must never be performed by changing a UI flag or by inferring missing values.
