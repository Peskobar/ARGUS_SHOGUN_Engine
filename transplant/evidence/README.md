# ARGUS SHOGUN — EVIDENCE LEDGER

Ten katalog przechowuje dowody potrzebne do kontrolowanego zastępowania danych DEMO.

## Najważniejsza granica

`VERIFIED` nie znaczy `RUNTIME`.

Rekord może być dobrze potwierdzonym twierdzeniem producenta, ale nadal nie może wejść do `app/src`, jeżeli:
- nie ma aktywnego konsumenta w V1,
- brakuje kontekstu potrzebnego do planu,
- istnieje nierozwiązany konflikt istotny dla tego samego kontekstu,
- metoda użycia nie odpowiada bieżącej operacji.

## Wersje

- `SHOGUN_EVIDENCE_LEDGER_v1.json` — pierwszy audyt aktualnych kart produktów. Zachowany jako historia dowodowa.
- `SHOGUN_EVIDENCE_LEDGER_v2.json` — Upgrade 4R. Rekoncyliuje v1 z oficjalnymi feedchartami i aktualnym kalkulatorem producenta.

`v2` jest bieżącym źródłem wniosku o dostępności wariantu Producent.

## Co naprawił Upgrade 4R

Pierwszy audyt za łatwo traktował różne wartości jako jeden konflikt.

Po sprawdzeniu feedchartów:
- Katana `5 ml/L` dotyczy kontekstu sadzonek/propagacji, a `0.2 ml/L` wegetacji i pierwszych tygodni kwitnienia. To rozdział kontekstu, nie jedna sprzeczna dawka harmonogramowa.
- PK Warrior ma dawkę zależną od tygodnia okna PK. `1 ml/L` i `0.5 ml/L` nie są sprzeczne, gdy zachowamy tydzień fazy.
- Silicon `1 ml/L` jest zgodny pomiędzy szczegółową instrukcją root-feed i oficjalnym feedchartem. Nagłówek `4 ml/L` pozostaje konfliktem copy, ale nie steruje harmonogramem.
- Samurai Terra nie ma jednej poprawnej dawki. Feedchart zależy od tygodnia i profilu wody, a aktualny kalkulator dodatkowo pyta o profil Light/Standard/Heavy.

## Reguła pierwszeństwa dla harmonogramu

Dla wartości planu stosujemy kolejność:

1. jawny, kontekstowy feedchart / wynik kalkulatora,
2. jawna, kontekstowa sekcja Product Info,
3. ogólne How To,
4. nagłówek lub etykieta obrazka.

Niższy poziom nie nadpisuje wyższego bez osobnego audytu.

## Aktualna luka runtime

Oficjalne dane harmonogramu istnieją. Aplikacja nie przechowuje jeszcze pełnego kontekstu potrzebnego do wyboru jednej wersji:
- tygodnia bieżącej fazy,
- profilu wody,
- profilu karmienia Light / Standard / Heavy.

Dlatego wariant Producent pozostaje niewykonywalny, ale powodem nie jest już „brak danych producenta”.

## Runtime

Do `app/src` trafia obecnie tylko wniosek o dostępności i identyfikator Ledgera. Żadne dawki z Ledgera v1/v2 nie są jeszcze importowane do planu.

Stan źródeł: sprawdzone 2026-09-01 na aktualnych materiałach Shogun Fertilisers.
