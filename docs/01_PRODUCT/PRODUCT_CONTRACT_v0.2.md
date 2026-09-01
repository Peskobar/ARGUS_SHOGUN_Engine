# ARGUS SHOGUN — PRODUCT CONTRACT v0.2

Status: **LOCK dla V1**
Data: 2026-09-01

## Cel

Lokalne, operatorskie narzędzie do przygotowania i wykonania planu na konkretny dzień cyklu.

ARGUS ma:

- pokazać dzień i kontekst,
- zaproponować warianty planu,
- przeliczyć wybrany wariant,
- przygotować listę produktów i narzędzi,
- przeprowadzić przez mixer z timerem,
- zapisać wykonanie,
- wspierać D1–D4 i podstawowe trendy.

## Własność decyzji

Operator jest właścicielem decyzji.

ARGUS doradza, przelicza, wykrywa konflikty i dokumentuje. Ostrzeżenie nie jest blokadą.

## Twarde zatrzymania

Tylko integralność techniczna:

- brak poprawnego planu,
- objętość nie jest dodatnią liczbą,
- dawka nie jest skończoną nieujemną liczbą,
- zduplikowany identyfikator składnika w pojedynczej operacji,
- błąd trwałego zapisu.

Nie są hard-blockami:

- rekomendacja ARGUS,
- niski poziom pewności,
- ostrzeżenie trendu,
- odstępstwo od wariantu polecanego,
- decyzja operatora o kontynuacji.

## Offline

Plan, przygotowanie, mixer, donice i historia działają bez sieci po pierwszym załadowaniu aplikacji. Stan użytkownika jest lokalny.

## Główny przepływ

`DZISIAJ → PLAN → PRZYGOTOWANIE → MIXER → PODLEWANIE ZAKOŃCZONE → HISTORIA`

## Plany

Stałe warianty bazowe:

- Producent
- Zbalansowany
- Wzrost

Korekta jest kartą/propozycją warunkową.

## Dane recepturowe

Silnik i UX są oddzielone od źródeł recepturowych. Seed V1 zawiera wyłącznie dane demonstracyjne oznaczone `DEMO_DATA_NOT_FOR_USE`.

Dane producenta mogą wejść do warstwy produkcyjnej dopiero z jawnie zapisanym źródłem i statusem weryfikacji.
