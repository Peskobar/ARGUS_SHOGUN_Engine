# ARGUS SHOGUN — Source Registry v1

Data freeze: 2026-08-23.

## Provenance rule

A number is not `VERIFIED` because it looks plausible. It is verified only when the application can trace it to a specific source, profile, stage/week, method and context.

Profiles are isolated. Values from `TERRA_LED_2024` must never be silently merged with `TERRA_LEGACY_HARD_SOFT`.

## SR-001 — SHOGUN current downloads index

- Publisher: SHOGUN Fertilisers
- URL: https://www.shogunfertilisers.com/pages/downloads
- Retrieved: 2026-08-23
- Status: CURRENT
- Evidence: official downloads page currently lists `LED Coco and Terra Feedchart` and `Autoflower Coco and Terra Feedchart` as separate feedcharts.

## SR-002 — SHOGUN LED Coco and Terra Feedchart

- Manufacturer document: `LED Coco and Terra Feedchart`
- Official provenance index: SR-001
- Indexed PDF mirror: https://ghedirect.co.uk/download/88/shogun/1639855/shogun-led-coco-and-terra-feedchart-web.pdf
- Mirror date: 2024-04-05
- Status: CURRENT MANUFACTURER DOCUMENT / MIRROR USED FOR TEXT EXTRACTION
- Units in document: mL / 10 L. Repository normalises to mL/L.

### Terra row transcribed into code

Baseline water: EC 0.4 mS/cm.

- Shogun Start: seedling/cuttings W1–W2 = 4 ml/L.
- Katana Roots: seedling/cuttings W1–W2 = 5 ml/L; VEG W1–W4 = 0.2 ml/L; FLOWER W1–W3 = 0.2 ml/L. Seedling use remains subject to product-page soak/cadence semantics.
- Samurai Terra Grow: VEG W1–W2 = 1.5 ml/L; VEG W3–W4 = 2.5 ml/L.
- Samurai Terra Bloom: FLOWER W1–W3 = 3.5 ml/L; W4 = 2.5 ml/L; W5–W7 = 2.0 ml/L.
- Sumo Active Boost: FLOWER W1–W8 = 2.0 ml/L.
- PK Warrior 9/18: FLOWER W4 = 1.0 ml/L; W5–W7 = 0.5 ml/L.
- Zenzym: VEG W1–W4 and FLOWER W1–W8 = 2.5 ml/L.
- Silicon: VEG W1–W4 and FLOWER W1–W7 = 1.0 ml/L.
- CalMag: no normal baseline row; note recommends 1 ml/L root treatment with pure/distilled/RO and soft water.
- Dragon Force is present in the manufacturer chart but is not yet part of the application inventory model.

### Water adjustment rules copied as discrete rules

The chart states:

- EC 0 pure/distilled/RO: +20% Terra nutrients.
- EC 0.2 soft water: +10% Terra nutrients.
- EC 0.4: baseline.
- EC 0.6+ hard water: −10% Coco/Terra nutrients.

ARGUS does **not** linearly interpolate between these anchors. An EC such as 0.53 is explicitly marked unresolved-between-anchors and the baseline number remains visible until a manufacturer calculator result or conscious decision resolves it.

The percentage is applied to Terra base nutrients only. It is not blindly multiplied into Roots, Zenzym, Silicon, Sumo, PK or CalMag.

### Process notes

- Terra application frequency can vary with the nutrient charge already present in soil: the chart says every watering or every 2–3 waterings may be appropriate.
- Silicon: premix in 5 L water and adjust to approximately pH 6.5 before adding to the tank.
- Final recommended pH: 5.5–6.5.
- For HPS/sodium lighting, chart notes reducing target conductivity by 15–20%. This does not modify the LED profile while LED is selected.

## SR-003 — Legacy Terra hard/soft feedchart

- URL: https://www.shogunfertilisers.com/media/yhqdxajh/shogun_-_terra_feedchart_new.pdf
- Status: LEGACY / SEPARATE PROFILE
- Code owner: `evidenceMatrix.ts`

Legacy values remain available for comparison and older workflows, but they are not allowed to overwrite LED 2024 values.

## SR-004 — PK Warrior current product page

- URL: https://www.shogunfertilisers.com/products/pk-warrior-9-18
- Retrieved: 2026-08-23
- Status: CURRENT

Standalone instructions state 0.5 ml/L in mid-flower, up to 1.0 ml/L in the first week, and say Bloom base should be reduced 25–50% to avoid overfeeding.

ARGUS provenance rule: when PK and Bloom come from the integrated LED feedchart, the app must **not** automatically perform another 25–50% subtraction. That would risk a double adjustment. Standalone and integrated provenance are distinct modes.

## Unresolved before AUTO PLAN

- Exact current Light/Standard/Heavy generated calculator tables are not versioned in the repository.
- Exact ion/guaranteed analysis of Terra Grow/Bloom is not established by SDS alone.
- CalMag Ca/Mg/Fe contribution needs label/guaranteed analysis if ion-balance calculations are added.
- Start product-page early-veg wording vs feedchart seedling placement remains a documented source conflict outside the LED profile transition logic.
- Live user background EC/pH and exact substrate/perlite ratio are still observed-state inputs, not manufacturer constants.
- Independent Work/agronomic red-team report is still pending.
