# ARGUS Nutrition Technician — Methodology Pass 2026-08-23

Purpose: define what the decision engine is allowed to infer before the external Work/red-team audit returns.

## Methodological verdict

**GO**
- versioned manufacturer profiles,
- qualitative WHY / LESS / MORE / OMIT,
- explicit conflict reporting,
- dry-run manufacturer plan,
- input/background-water EC as context,
- separate handling of substrate/root-zone feedback.

**HOLD**
- automatic dose optimisation beyond explicit manufacturer rules,
- interpolation between manufacturer EC anchors,
- diagnosis from a single visual symptom,
- conversion of hydroponic mg/L optima to SHOGUN Terra ml/L,
- autonomous AUTO EXECUTION.

## Evidence synthesis

### 1. More fertiliser is not a monotonic yield control

Cannabis experiments show plateau and negative response at higher nutrient supply. The engine therefore treats MORE as a risk simulation, never a simple positive multiplier.

Key evidence:
- Anderson et al. 2021, PLOS ONE, varying fertigation rates in essential-oil hemp: https://doi.org/10.1371/journal.pone.0252985
- Hershkowitz et al. 2025, Frontiers in Plant Science, elevated root-zone P / EC: https://doi.org/10.3389/fpls.2025.1433985

### 2. EC is a state variable, not an ion analysis

Electrical conductivity reflects total ionic conductivity. Different ion mixtures can produce similar EC and the same EC can hide different nutrient balances. Therefore ARGUS separates:

- background-water EC,
- prepared-solution/input EC,
- runoff/drain EC,
- root-zone/substrate EC.

The engine is forbidden from reasoning `high EC => CalMag is high` or `low EC => add one specific product` without provenance/history.

Supporting methodology:
- Ahn et al. 2021, EC-based nutrient recycling and ion balance: https://doi.org/10.3389/fpls.2021.656403
- Ahn et al. 2020, irrigation/drainage/EC data translated into plant nutrition indicators: https://doi.org/10.3390/agronomy10091306
- Langenfeld et al. 2022, Principles of Nutrient and Water Management for Indoor Agriculture: https://doi.org/10.3390/su141912558

### 3. Medium is causal context

Peat/perlite, coco and rockwool differ in water-holding capacity, aeration, buffering and fertigation behaviour. The engine therefore tags hydro/coco/rockwool nutrient findings as transfer-limited when making Terra/soil+perlite decisions.

Key evidence:
- Schober et al. 2023, differing growing media in medical cannabis: https://doi.org/10.1016/j.indcrop.2023.117172
- Ortiz-Delvasto et al. 2023, substrate water availability and cannabis physiology: https://doi.org/10.1007/s11104-023-06341-8

### 4. Nutrient interactions defeat one-slider reasoning

N, P and K interact, and Ca/Mg/K competition matters. A change to one product may alter several ions and osmotic load simultaneously.

Key evidence:
- Kpai et al. 2024, NPK response-surface analysis in vegetative Cannabis: https://doi.org/10.3389/fpls.2024.1501484
- Morad & Bernstein 2023, magnesium supply and Ca/K uptake: https://doi.org/10.3390/plants12142676
- Saloner & Bernstein 2022, NH4:NO3 form and yield/metabolites: https://doi.org/10.3389/fpls.2022.830224

### 5. Leaf appearance is evidence, not a diagnosis engine

Single-element deficiency studies show useful symptom patterns, but visual state should be combined with dose history, water, pH, EC and substrate context.

Key evidence:
- Llewellyn et al. 2023: https://doi.org/10.3390/plants12030422

## Decision architecture locked for v1

```
MANUFACTURER PROFILE
        +
WATER CHEMISTRY / BACKGROUND EC
        +
SCIENCE GUARDRAILS
        +
SUBSTRATE / ROOT-ZONE STATE
        +
ENVIRONMENT + HISTORY + OBSERVATION
        +
UNCERTAINTY / CONFLICTS
        =
DECISION
```

Manufacturer values provide the operational starting point. Peer-reviewed science may constrain or warn, but a transfer-limited paper cannot silently overwrite an ml/L manufacturer instruction.

## New fail-closed rules from this pass

1. Never interpolate the LED chart water modifiers between EC anchors without an explicit manufacturer rule.
2. Never multiply all additives by the Terra base water modifier.
3. Never make CalMag default solely because a legacy recipe contained it.
4. Never apply the PK standalone `reduce Bloom 25–50%` a second time to an integrated feedchart without provenance proof.
5. Never infer a specific ion excess/deficiency from total EC alone.
6. Never allow a photo symptom to directly create a dose change.
7. Never connect Dry Run to physical execution while `autoExecutionAllowed=false`.

## External audit handoff

The Work/red-team report should be compared against this document and `SOURCE_REGISTRY_V1.md` claim-by-claim. Any disagreement affecting a numeric dose, method, cadence or process rule reopens that item as `CONFLICT` and blocks AUTO PLAN until resolved.
