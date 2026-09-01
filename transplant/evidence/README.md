# ARGUS SHOGUN — EVIDENCE LEDGER

Ten katalog przechowuje dowody potrzebne do późniejszego, kontrolowanego zastępowania danych DEMO.

## Najważniejsza granica

`VERIFIED` nie znaczy `RUNTIME`.

Rekord może być dobrze potwierdzonym twierdzeniem producenta, ale nadal nie może wejść do `app/src`, jeżeli:
- nie ma aktywnego konsumenta w V1,
- brakuje kontekstu potrzebnego do planu,
- istnieje konflikt z innym aktualnym źródłem,
- metoda użycia nie odpowiada bieżącej operacji.

## Statusy

- `VERIFIED` — aktualne oficjalne źródło producenta bezpośrednio potwierdza atomowe twierdzenie.
- `PARTIAL` — źródło potwierdza tylko fragment informacji potrzebnej do planu.
- `CONFLICT` — aktualny materiał producenta zawiera sprzeczne wartości lub instrukcje dla tego samego pytania operacyjnego.

## Zasada modelu

Ledger zapisuje pojedyncze twierdzenia, nie gotowe receptury.

Przykład:
- `Katana Roots / ROOT_FEED / 0.2 ml/L` jest osobnym claimem,
- `Katana Roots / generic how-to / 5 ml/L` jest osobnym claimem,
- oba należą do jednego `conflictGroup`.

Dzięki temu aplikacja nie może przypadkiem wybrać jednej liczby ze strony i ogłosić jej prawdą producenta.

## Runtime

Upgrade 3 nie zmienia `app/`.

Pierwsza promocja do aktywnego planu następuje dopiero w osobnym upgrade i obejmuje najmniejszy zestaw claimów potrzebny konkretnemu przepływowi operatora.

## Główny plik

`SHOGUN_EVIDENCE_LEDGER_v1.json`

Stan źródeł: sprawdzone 2026-09-01 na aktualnych stronach Shogun Fertilisers.
