# Evidence Matrix v1 — ARGUS SHOGUN Engine

Status: **working scientific baseline, not a finished agronomic prescription**  
Scope: **TERRA / SOIL + perlit**  
Research cut: 2026-08-23

## 1. Zasada nadrzędna

Technik Żywienia nie może opierać rekomendacji na jednym źródle ani na samym feedcharcie.

Każda decyzja powinna być złożona z czterech warstw:

1. **Manufacturer Layer** — oficjalna dawka, okno stosowania i sposób użycia SHOGUN.
2. **Peer Reviewed Guardrails** — literatura naukowa opisująca niedobór, nadmiar, antagonizmy i ograniczenia transferu między systemami.
3. **Observed State** — realne EC/pH wody, medium, tydzień, historia nawożenia, objawy i później runoff/EC medium.
4. **Decision** — rekomendacja wraz z confidence i jawnym uzasadnieniem.

Żadna pojedyncza publikacja nie nadpisuje feedchartu producenta automatycznie. Żadna wartość mg/L uzyskana w DWC/hydro nie jest kopiowana 1:1 do gleby/peat-perlite.

## 2. Hierarchia dowodów

| Status | Znaczenie |
|---|---|
| VERIFIED | Znaleziono bezpośrednie źródło producenta lub wiarygodną publikację dla danej tezy. |
| UNVERIFIED | Informacja istnieje w aplikacji/założeniach, ale nie ma jeszcze wystarczającego źródła. |
| CONFLICT | Co najmniej dwa wiarygodne źródła podają różne instrukcje albo kontekst jest niejednoznaczny. |

| Applicability | Znaczenie |
|---|---|
| DIRECT | Źródło dotyczy bezpośrednio produktu albo bardzo zbliżonego medium/systemu. |
| TRANSFER_LIMITED | Mechanizm jest użyteczny, ale badanie wykonano w innym systemie, np. DWC. |
| GENERAL_PHYSIOLOGY | Ogólna fizjologia roślinna, pomocnicza, nie służy do ustalania dawki. |

## 3. Zweryfikowane okna producenta — Terra

Źródło bazowe: oficjalny SHOGUN Terra hard/soft water feed chart.

### Samurai Terra Grow

- VEG W1–W2: HARD 1–2 ml/L; SOFT 2–3 ml/L
- VEG W3–W4: HARD 2–3 ml/L; SOFT 3–4 ml/L
- Grow i Bloom **nigdy razem w jednym roztworze**.

### Samurai Terra Bloom

- FLOWER W1–W3: HARD 3–4 ml/L; SOFT 4 ml/L
- FLOWER W4: HARD 2–3 ml/L; SOFT 3–4 ml/L
- FLOWER W5–W7: HARD 1–2 ml/L; SOFT 2–3 ml/L

### Katana Roots

- seedling/cuttings W1–W2: 5 ml/L
- VEG W1–W4: 0.2 ml/L
- FLOWER W1–W3: 0.2 ml/L

### Zenzym

- VEG W1–W4: 2.5 ml/L
- FLOWER W1–W8: 2.5 ml/L
- producent identyfikuje cellulase, xylanase i beta-glucanase jako składniki mieszanki enzymatycznej.

### Silicon

- VEG W1–W4: 1 ml/L
- FLOWER W1–W8: 1 ml/L
- **hard process rule:** Silicon najpierw do czystej wody; następnie pH poniżej 7 przed dodaniem bazy.
- finalny pomiar/korekta pH nadal wykonywany po całej mieszance.

### CalMag

- VEG HARD: 0.5 ml/L
- VEG SOFT: 1 ml/L
- FLOWER HARD: 0–0.5 ml/L
- FLOWER SOFT: 0–1 ml/L
- foliar interwencyjnie: 15 ml/L, pH 5–7, raz w tygodniu do ustąpienia problemu.

### Sumo Active Boost

- FLOWER W1–W6: 2 ml/L
- W7: 1.5 ml/L
- W8: 1 ml/L
- foliar: 2 ml/L w FLOWER W1 i W4 według feedchartu.

### PK Warrior 9/18

- FLOWER W4: 1 ml/L
- W5–W7: 0.5 ml/L
- aktualna strona produktu dodatkowo mówi, aby przy stosowaniu PK zmniejszyć Bloom base o 25–50%, aby ograniczyć przekarmienie.

## 4. Zweryfikowane science guardrails

### NPK to system, nie trzy suwaki

Badania Cannabis z response surface wykazały istotne interakcje N×K, K×P i N×P×K. Wzrost P i K może wpływać na Mg w tkankach. Dlatego funkcja `whatElseChanges` jest obowiązkowa.

### Więcej nawozu nie znaczy więcej plonu

Badania podwyższonego EC/P pokazują plateau: wyższe stężenie składników może zwiększać ich akumulację bez poprawy plonu lub jakości. `MORE` jest scenariuszem ryzyka, nigdy zielonym przyciskiem „więcej = lepiej”.

### N ma dwustronne optimum

Niedobór N ogranicza fotosyntezę, pigmenty i biomasę. Nadmiar również może ograniczać rozwój i zmniejszać nutrient-use efficiency. Dlatego LESS i MORE są asymetryczne.

### Forma N ma znaczenie

Wysoki udział NH4 względem NO3 może pogarszać funkcję, plon i metabolity wtórne. Pełna analiza nawozu bazowego wymaga więc kiedyś danych NH4:NO3, nie tylko ogólnego N.

### Mg/Ca/K konkurują

W badaniu medycznego Cannabis zwiększone Mg ograniczało pobieranie/translokację Ca i K. CalMag nie może być traktowany jako neutralny „booster bezpieczeństwa”.

### Objaw wizualny nie jest diagnozą

Badania pojedynczych braków N/P/K/Ca/Mg/S/Fe/Mn pokazały duże straty wzrostu i plonu, ale moment wystąpienia symptomów nie zawsze odpowiadał idealnie analizie tkanek. Technik ma łączyć: objaw + historia + EC/pH + medium + etap.

### Peat/perlite ma własną fizykę

Bezpośrednie badania Cannabis porównujące peat-perlite, coco i rockwool pokazują wpływ medium i harmonogramu nawadniania na wzrost oraz pobieranie N. Dane hydroponiczne w kontekście TERRA mają `TRANSFER_LIMITED`.

### Silicon: korzyść nie jest automatycznie „więcej biomasy”

Badania na Cannabis/hemp w peat/perlite z dodatkiem calcium silicate zwiększały akumulację Si, ale nie zawsze zwiększały biomasę lub stężenie kannabinoidów. To wspiera ostrożny model: Silicon jako wsparcie strukturalne/stresowe, nie gwarant plonu.

## 5. Woda — Emmerich reference

Aktualna analiza Stadtwerke Emmerich (04.04.2025):

- przewodność 25°C: 530 µS/cm ≈ 0.53 mS/cm
- pH: 7.49
- twardość: 12.7 °dH, klasa `mittel`
- Ca: 73.9 mg/L
- Mg: 10.2 mg/L
- K: 7.66 mg/L
- NO3: 12.6 mg/L

To **nie jest pomiar z konkretnego kranu w dniu mieszania**. W aplikacji ma status `REFERENCE_ONLY`. Zmierzony background EC i pH użytkownika mają pierwszeństwo.

Nie mapujemy 12.7 °dH automatycznie na SHOGUN HARD/SOFT, ponieważ aktualny kalkulator producenta każe wybierać profil na podstawie rzeczywistego background EC lub podać Custom EC.

## 6. Known gaps — badania tylko tam, gdzie jest dziura

1. pełny skład Samurai Terra Grow: NPK, Ca, Mg, S, mikroelementy, NH4:NO3;
2. pełny skład Samurai Terra Bloom;
3. ilość Ca/Mg/Fe wniesiona przez 1 ml/L CalMag;
4. dokładny skład aktywny Katana Roots;
5. skład i wkład do EC Sumo Active Boost;
6. skład produktu Silicon i realna ilość Si/K na 1 ml/L;
7. aktualne instrukcje Geisha Foliar i status READY_TO_SPRAY;
8. reguła przejścia SHOGUN background EC → HARD/SOFT/CUSTOM z aktualnego kalkulatora;
9. rzeczywisty background EC i pH użytkownika;
10. dokładny skład medium i procent perlitu.

## 7. Blokady bezpieczeństwa decyzji

- nie wolno premiksować koncentratów;
- nie wolno łączyć Terra Grow i Bloom;
- Silicon wymaga `PRE_BASE_PH_GATE`;
- pH finalne sprawdzamy po całej mieszance;
- PK Warrior wymaga korekty Bloom base;
- nie można zwiększyć CalMag bez ostrzeżenia Ca/Mg/K;
- `MORE` nie jest automatycznym zaleceniem;
- `OMIT BASE` wymaga jawnego override;
- nie można przenosić dawki mg/L z hydro do Terra jako receptury;
- przy CUSTOM/RO bez zweryfikowanego background EC rekomendacja zależna od wody nie może otrzymać `HIGH confidence`.

## 8. Źródła główne

Manufacturer:
- https://www.shogunfertilisers.com/media/yhqdxajh/shogun_-_terra_feedchart_new.pdf
- https://www.shogunfertilisers.com/products/samurai-terra
- https://www.shogunfertilisers.com/products/silicon
- https://www.shogunfertilisers.com/products/calmag
- https://www.shogunfertilisers.com/products/zenzym
- https://www.shogunfertilisers.com/products/pk-warrior-9-18

Peer reviewed:
- Kpai et al. 2024 — https://doi.org/10.3389/fpls.2024.1501484
- Bevan et al. 2021 — https://doi.org/10.3389/fpls.2021.764103
- Saloner & Bernstein 2020 — https://doi.org/10.3389/fpls.2020.572293
- Saloner & Bernstein 2022 — https://doi.org/10.3389/fpls.2022.830224
- Morad & Bernstein 2023 — https://doi.org/10.3390/plants12142676
- Llewellyn et al. 2023 — https://doi.org/10.3390/plants12030422
- Hershkowitz et al. 2025 — https://doi.org/10.3389/fpls.2025.1433985
- Schober et al. 2023 — https://doi.org/10.1016/j.indcrop.2023.117172

Local water:
- https://www.stadtwerke-emmerich.de/de/Netzbetrieb-/Trinkwasser-Netz/Wasserhaerte/
- https://www.stadtwerke-emmerich.de/de/Netzbetrieb-/Trinkwasser-Netz/Wasserhaerte/Wasserhaerte/2024-Trinkwasseranalyse.pdf
