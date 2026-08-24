# Agronomic Audit v1 — Findings

Date: 2026-08-23  
Scope: Evidence Matrix / Nutrition Technician v1  
Type: internal adversarial audit using current SHOGUN primary sources + triangulated peer-reviewed literature. This is **not** a substitute for an independent agronomist review.

## Executive result

No finding justifies discarding the architecture. The layered model is sound, but **automated final recommendations must stay blocked** until schedule-profile provenance, PK/base handling and application-method cadence are made explicit.

### MAJOR-01 — Schedule profile is missing from dose provenance

**Problem**  
Current SHOGUN calculator distinguishes `Light`, `Standard` and `Heavy` schedules using environmental conditions. The Evidence Matrix currently stores weekly HARD/SOFT dose windows without a `scheduleProfile` field.

**Why it matters**  
A numerically correct value from one schedule can become the wrong recommendation in another schedule while still carrying `VERIFIED`.

**Current manufacturer criteria**
- Light: leaf temperature consistently >25°C and RH <50%.
- Standard: leaf temperature consistently <25°C and RH >50%.
- Heavy: LED grow rooms and/or closed-loop rooms with active cooling + CO₂.

**Safe correction**
- add `scheduleProfile: LIGHT | STANDARD | HEAVY | LEGACY_STATIC | UNKNOWN` to every manufacturer dose window;
- do not derive Light/Heavy by multiplying Standard values;
- until current calculator outputs are captured per profile, label static chart windows `LEGACY_STATIC/UNRESOLVED_PROFILE` and do not call them the unique recommended dose.

Status: **OPEN / blocks automated final dose selection**.

---

### MAJOR-02 — PK Warrior + Bloom base can be double-adjusted if provenance is ignored

**Problem**  
Current PK Warrior product instructions say to reduce Bloom base by 25–50% while using PK. A complete integrated feedchart may already show base values designed for the same weeks.

**Failure mode**  
If the engine starts with an integrated feedchart value and then blindly applies another 25–50% reduction, it can underfeed. If it starts with a standalone/general Bloom rate and performs no reduction, it can overfeed.

**Safe correction**
- dose records need `provenanceMode: INTEGRATED_FEEDCHART | STANDALONE_PRODUCT_RATE`;
- never auto-apply the reduction to `INTEGRATED_FEEDCHART` without proving that the chart expects it;
- for `STANDALONE_PRODUCT_RATE + PK`, require an explicit base adjustment decision;
- current v1 warning is safe because it does **not** automatically subtract anything.

Status: **OPEN / blocks automatic PK/base arithmetic**.

---

### MAJOR-03 — Katana Roots 5 ml/L for seedlings is a protocol, not a generic continuous root-feed dose

**Problem**  
Current manufacturer page says: soak plugs/cubes in 5 ml/L for 15 minutes, then water with the same mix **once a week** until ready to transplant. The current Evidence Matrix encodes the 5 ml/L seedling window too generically as `ROOT_FEED`.

**Why it matters**  
A future scheduler could interpret it as an every-irrigation dose.

**Safe correction**
- model `applicationMethod = SOAK` plus `duration = 15 min` for initial use;
- model subsequent 5 ml/L application with `cadence = WEEKLY`, not `EVERY_FEED`;
- distinguish concentration from frequency in the data model.

Status: **OPEN / blocks automated seedling cadence**.

---

### MAJOR-04 — `VERIFIED` currently mixes different kinds of verification

**Problem**  
A product can have a verified manufacturer dose while its full elemental composition remains unknown. One boolean-like product status hides that distinction.

**Example**
- Terra Grow/Bloom: dose windows and process instructions are source-backed;
- full ion contribution, guaranteed analysis and exact NH₄:NO₃ are not fully represented by the SDS.

**Safe correction**
Split verification into at least:
- `doseStatus`
- `processStatus`
- `compositionStatus`
- `scienceGuardrailStatus`

A high-confidence dose does not imply high-confidence composition modelling.

Status: **OPEN / architecture refinement**.

---

### MINOR-01 — CalMag has live vs legacy web-page inconsistency

The current product page states root-feed `0–1 ml/L`. An older Polish URL still indexed on the site states `1–2 ml/L`. Current feedcharts also provide water-specific values.

**Rule:** current canonical product page + current feedchart win; legacy page must not silently raise dose confidence.

Status: **DOCUMENTED**.

---

### MINOR-02 — Manufacturer marketing claims are not science guardrails

Examples such as SmartZen “up to 8%” or Sumo Active “up to 10%” are manufacturer performance claims. They may be useful metadata but must not appear in `MORE` as guaranteed response.

Status: **PASS in current decision logic**; keep claims out of quantitative prediction.

---

### INFO-01 — Current SHOGUN water threshold can classify a measured EC

Current SHOGUN CalMag/calculator copy describes:
- hard water: background EC >0.4 mS/cm;
- soft water: background EC <0.4 mS/cm;
- RO: approximately EC 0.0.

The Emmerich municipal reference is about 0.53 mS/cm, so **if a live tap measurement is similar**, it falls on the manufacturer’s hard-water side. The municipal report itself must remain `REFERENCE_ONLY`.

Action: add a water-classification suggestion, not a silent profile change.

---

### INFO-02 — SDS gives useful partial composition, not a guaranteed nutrient analysis

Current official SDS (revision 10/10/2024) exposes hazardous/regulated constituents:

**Terra Grow**
- ammonium nitrate: 10–15% w/w
- potassium nitrate: 3–5%
- potassium dihydrogen phosphate: 1–3%
- magnesium nitrate: 1–3%
- potassium sulfate: 1–3%
- sodium nitrate: 1–3%
- product pH in SDS: 2.2; density about 1.13 g/cm³

**Terra Bloom**
- potassium nitrate: 5–10%
- ammonium nitrate: 5–10%
- magnesium nitrate: 3–5%
- potassium dihydrogen phosphate: 3–5%
- potassium sulfate: 1–3%
- product pH in SDS: 2.6; density about 1.133 g/cm³

**Silicon**
- silicic acid, potassium salt: 25–40% w/w in SDS.

**Important limitation:** SDS Section 3 is written for hazard disclosure. It is not a complete fertilizer guaranteed analysis and cannot by itself produce exact mg/L N, P, K, Mg or Si at a given ml/L dose.

Action: store as `PARTIAL_SDS_COMPOSITION`, never as exact elemental recipe data.

---

### INFO-03 — Katana and Sumo SDS do not disclose the useful actives as a full formula

Their current SDS Section 3 mainly exposes preservatives at reportable hazard levels. Product pages describe:
- Katana: boron/biotin synergy and cold-pressed seaweed-derived components;
- Sumo Active: triacontanol and sea-plant extracts/hormonal compounds.

Treat these as `MANUFACTURER_INGREDIENT_CLAIM`, not independently quantified composition.

---

## Cross-check against science layer

Triangulation across Consensus, SciSpace and Scholar/OpenAlex supports the current guardrails:

- NPK interactions are non-linear;
- high input can reach a plateau without yield benefit;
- excessive or deficient N can both reduce performance;
- NH₄:NO₃ form matters;
- Mg can antagonise Ca/K uptake;
- single visual symptoms are insufficient for a confident deficiency diagnosis;
- peat-perlite, coir and rockwool are not nutritionally interchangeable even when the same crop is grown.

No paper result should be promoted from `TRANSFER_LIMITED` to a direct Terra dose merely because the species matches.

## Audit decision

**Architecture: PASS WITH CONDITIONS**  
**Manufacturer-dose automation: HOLD** until MAJOR-01 and MAJOR-02 are resolved.  
**Seedling automation: HOLD** until MAJOR-03 is resolved.  
**Evidence UI / WHY-LESS-MORE-OMIT qualitative mode: GO** because it exposes uncertainty rather than hiding it.
