# Independent Agronomic Audit Protocol

Purpose: adversarial review of `Evidence Matrix v1` before automated Nutrition Technician recommendations are treated as operational guidance.

## Audit target

Review these artifacts together:

- `src/evidenceMatrix.ts`
- `src/nutritionTechnician.ts`
- `docs/EVIDENCE_MATRIX_V1.md`
- current SHOGUN manufacturer feedcharts/product pages
- cited peer-reviewed papers

The audit is **not** a generic cannabis grow guide. Its job is to find where the application could make an unjustified, overconfident or internally inconsistent nutrition decision.

## Auditor stance

Assume every claim is wrong until its source, applicability and inference chain are clear.

For each finding classify:

- `CRITICAL`: could lead to a materially unsafe or strongly misleading nutrient decision.
- `MAJOR`: important logic/source problem that can alter recommendations.
- `MINOR`: wording, provenance or model-quality weakness.
- `INFO`: useful improvement without direct decision impact.

## Required attack questions

### A. Manufacturer fidelity

1. Are all ml/L values copied correctly from the current SHOGUN source?
2. Are HARD/SOFT/CUSTOM/RO contexts distinguished correctly?
3. Are weekly windows correct?
4. Is a product marked BASE/SUPPORT/CONDITIONAL/OPTIONAL consistently with manufacturer usage?
5. Are product-page general rules being confused with feedchart-specific values?
6. Are there current-vs-legacy SHOGUN conflicts?
7. Is any marketing statement incorrectly promoted to a hard agronomic fact?

### B. Transferability

1. Is evidence from DWC/hydro marked `TRANSFER_LIMITED` when applied to peat/soil-perlite?
2. Does any cultivar-specific optimum become a universal target?
3. Are hemp/CBD studies being transferred to drug-type cannabis without qualification?
4. Does the system distinguish mechanism evidence from dose evidence?
5. Does medium water-holding capacity / fertigation frequency alter the interpretation?

### C. Nutrient interactions

Challenge every isolated adjustment:

- N ↔ P/K
- K ↔ Ca/Mg
- Mg ↔ Ca/K
- P ↔ Mg/micronutrients
- NH4:NO3 ↔ pH/plant response
- high EC ↔ osmotic stress / nutrient accumulation

For each `MORE` path ask: **what else changes?**

### D. Water

1. Is municipal analysis clearly separated from live user measurement?
2. Is background EC handled before choosing HARD/SOFT?
3. Are Ca/Mg already present in source water considered before CalMag?
4. Is pH interpreted separately from alkalinity/buffering?
5. Does the app avoid pretending °dH alone is enough to classify SHOGUN water profile?

### E. Process chemistry

Verify hard rules:

- no premixing of concentrated products;
- Silicon to plain water first;
- intermediate pH gate before base where manufacturer requires it;
- Grow and Bloom never together;
- final pH measurement after the complete nutrient solution;
- PK Warrior requires base-feed adjustment;
- mixing order and execution order cannot be changed by UI sorting.

### F. WHY / LESS / MORE / OMIT

For every product:

- WHY must describe function without promising unproven yield effects;
- LESS must distinguish reduced support from true deficiency risk;
- MORE must state plateau/toxicity/antagonism risks where evidence exists;
- OMIT must distinguish BASE from optional/support products;
- quantitative changes must not be invented from qualitative literature.

### G. Confidence calibration

A `HIGH` recommendation requires:

1. direct manufacturer source for dose/process;
2. correct context (medium, stage, method, water profile);
3. no unresolved source conflict affecting the decision;
4. no unsupported transfer from hydro to Terra;
5. no missing critical measurement explicitly required by the decision.

If any item fails, confidence must fall to MEDIUM/LOW or recommendation must be blocked.

## Mandatory adversarial scenarios

1. **Unknown tap water**: CUSTOM, no EC. App must not silently select HARD or SOFT.
2. **Emmerich reference only**: municipal EC/Ca/Mg known but no live measurement. Must stay `REFERENCE_ONLY`.
3. **CalMag +25% while PK active**: must warn about K/Ca/Mg interaction.
4. **PK Warrior with full Bloom base**: must warn/block until base reduction decision is explicit.
5. **Omit Terra Grow in active veg**: high-risk / explicit override.
6. **Double Silicon**: no promise of extra biomass; process/pH warning.
7. **Hydro study says optimal X mg/L**: app must not convert it to an ml/L Terra dose without product composition and transfer justification.
8. **Leaf looks Mg-deficient**: app must ask/check history + pH/EC/water context instead of diagnosing from image alone.
9. **User selects Heavy because LEDs are present but no CO2/active cooling**: do not infer Heavy from one environmental trait if manufacturer conditions are not satisfied.
10. **Late flower**: ensure Root, Boost, PK and base windows are not extended by generic `stage=BLOOM` logic.

## Acceptance criteria

The Matrix passes v1 audit only when:

- no CRITICAL findings remain;
- every MAJOR finding is fixed or explicitly accepted with rationale;
- every numerical dose has a direct source and context;
- every peer-reviewed claim has applicability/confidence metadata;
- every unresolved product-composition gap is visible to the engine;
- weekly tests cover hard water, soft water and unknown-water paths;
- execution tests cover Silicon gate and PK/base interaction;
- no scenario converts `MORE` into an automatic positive recommendation.

## External auditor prompt

> You are an independent plant-nutrition reviewer. Audit the supplied ARGUS SHOGUN Evidence Matrix as if a wrong recommendation could damage a crop. Do not improve the prose first. Try to falsify the logic. Verify manufacturer doses against current primary sources, then evaluate every scientific inference for system/cultivar transferability. Flag unsupported numeric extrapolation, hidden assumptions, nutrient antagonisms, water-profile mistakes, confidence inflation and conflicts between product instructions. Return findings with severity, exact affected field/rule, evidence, why it matters, and the smallest safe correction. Do not invent missing composition data.

## Audit ownership

Security and software correctness are reviewed separately. A security scanner cannot certify agronomic truth, and an agronomist cannot certify input validation or software integrity.
