# Porting notes: PR #3 / PR #5

PR #3 introduced useful UI integration ideas but also retained multiple physical execution paths (`AppLegacy`, PlannerV2, PlannerV3). Those execution paths are superseded by the single-authority release architecture and must not be merged back.

PR #5 introduced the evidence matrix, manufacturer/source models, water/medium/observation models, Decision Kernel, audit locks and dry-run Nutrition logic. Those modules are ported forward conceptually, while stale AI Studio dependencies and inherited execution paths are rejected.

The integration branch is therefore a selective forward-port, not a blind merge of either draft.
