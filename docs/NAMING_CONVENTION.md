# ARGUS SHOGUN — Naming Convention

## Canonical user-facing name

**ARGUS Technik Żywienia**

This is the canonical Polish product/module name shown to the operator.

## Internal code names

Existing identifiers such as:
- `NutritionTechnicianPanel`
- `nutritionTechnician.ts`
- `nutritionDecisionKernel.ts`
- other `Nutrition*` types/functions

are implementation names only. They may remain during hardening to avoid a broad rename-only refactor mixed with safety changes.

## Rule

User-facing UI, documentation, PR summaries and operating instructions must use **Technik Żywienia**.

A later controlled refactor may rename internal symbols separately after the unified workflow and safety gates are stable.
