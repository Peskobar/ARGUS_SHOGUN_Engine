# ARGUS SHOGUN — DECISION LEDGER v0.2

Data zamknięcia: 2026-09-01
Status: **PRODUCT / UX LOCK**

## Potwierdzone

- Produkt: **ARGUS SHOGUN**.
- Stary `ARGUS_SHOGUN_Engine` jest dawcą kodu / repo referencyjnym, nie architekturą docelową.
- Core działa offline.
- Operator pozostaje właścicielem decyzji.
- Aplikacja proponuje plan na dzień, operator wybiera wariant i może kontynuować mimo ostrzeżeń domenowych.
- Internet nie jest wymagany do planu, przygotowania, mixera, donic ani historii.

## Nawigacja

`Dzisiaj | Plan | Donice | Mixer | Historia | Trendy`

## Plan

Trzy warianty bazowe:

1. Producent
2. Zbalansowany
3. Wzrost

`Korekta` nie jest stałym czwartym wariantem. Pojawia się jako propozycja kontekstowa, gdy obserwacje lub trend uzasadniają zmianę.

Jeden wariant może otrzymać etykietę `ARGUS poleca`.

## Control Policy

Trzy poziomy kontroli:

- PRO
- STANDARD
- UNLOCKED

Aplikacja pamięta ostatnio używany poziom.

### Zamknięcie UNLOCKED

UNLOCKED usuwa wszystkie blokady operatorskie wynikające z reguł domenowych, rekomendacji, braków pewności i ostrzeżeń.

ARGUS może nadal:

- ostrzec,
- pokazać ryzyko,
- wyjaśnić przyczynę,
- zaproponować alternatywę,
- zapisać override operatora.

Hard-block jest dopuszczalny wyłącznie, gdy operacja jest technicznie niewykonalna lub uszkodziłaby integralność danych, np. `NaN`, ujemna objętość, brak obiektu planu, duplikaty identyfikatorów w jednej operacji lub błąd zapisu.

## UX

- DZISIAJ: minimum informacji, jedna duża karta planu.
- Technik: bez osobnej zakładki, przez `Dlaczego taki plan?`.
- Przygotowanie: pełna lista potrzebnych produktów, bez obowiązkowego odhaczania.
- Strzykawki: system dobiera pojemność; bez numerowania S1/S2/S3.
- Mixer: `DODAJ` → `START MIESZANIA` → timer → następny krok; operator może pominąć timer/krok.
- Donice D1–D4: osobna historia masy.
- Historia zapisuje to, co wykonano, nie tylko to, co planowano.
- Trendy V1: masa D1–D4, odstępy między wykonaniami, historia wariantów.

## Poza V1

- pełny magazyn,
- BIO-MAP,
- chmura,
- rozbudowane AI/RAG,
- automatyczne sterowanie sprzętem.

## Założenia zabronione

- nie traktować starego Engine jako specyfikacji,
- nie przywracać równoległych workflow Technician / Planner / Legacy,
- nie dodawać widocznych bramek bez korzyści,
- nie kopiować modułów z `legacy/` hurtowo,
- nie przedstawiać danych demonstracyjnych jako zweryfikowanych dawek.
