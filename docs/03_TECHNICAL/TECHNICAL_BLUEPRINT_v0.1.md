# ARGUS SHOGUN — TECHNICAL BLUEPRINT v0.1

## Stack

- React
- TypeScript
- Vite
- Web Storage (`localStorage`)
- Service Worker dla trybu offline po pierwszym uruchomieniu

Bez backendu w V1.

## Granice

### UI

Wyświetla stan i wysyła intencje operatora. Nie posiada własnych reguł wyliczeń.

### Domain

Czyste funkcje:

- budowa wariantów planu,
- skalowanie partii,
- walidacja integralności technicznej,
- sygnały/advisories.

### Store

Jeden lokalny stan aplikacji. Persistencja odbywa się po każdej zmianie.

### Evidence/Data

Dane recepturowe są osobną warstwą. Każdy zestaw danych musi mieć status źródła. Seed V1 = `DEMO_DATA_NOT_FOR_USE`.

## Model wykonania

1. operator wybiera plan,
2. engine wylicza snapshot planu dla objętości partii,
3. preparation renderuje snapshot,
4. mixer przechodzi przez kroki,
5. przed finalnym zapisem wykonywana jest tylko walidacja techniczna,
6. do historii trafia snapshot wykonania.

Historia nie odwołuje się wstecz do aktualnej wersji planu.

## Persistence

Klucz: `argus-shogun-v1-state`.

Przy uszkodzonym JSON aplikacja wraca do bezpiecznego lokalnego stanu startowego i nie interpretuje śmieci jako danych.

## Legacy boundary

Kod nowej aplikacji nie importuje niczego z `legacy/`.

Przeniesienie dawcy wymaga świadomego portu do `app/src/` oraz testu zachowania.

## Testy

Minimum:

- skalowanie partii,
- trzy warianty bazowe,
- odrzucenie `NaN`, wartości ujemnych i duplikatów ID,
- ostrzeżenie nie może pojawić się w tablicy hard-blockerów.

## PWA/offline

Service Worker cache'uje pobrane zasoby aplikacji. Operacje domenowe nie wykonują requestów sieciowych.
