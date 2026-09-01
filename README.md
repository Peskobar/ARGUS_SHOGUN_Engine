# ARGUS SHOGUN — NEW ENGINE

Nowa aplikacja operatorska budowana od czystego `main`.

## Zasada produktu

**ARGUS doradza. Operator decyduje. System liczy i zapisuje.**

- brak domenowych hard-blocków,
- ostrzeżenia nie odbierają operatorowi możliwości kontynuacji,
- twarde zatrzymanie występuje wyłącznie przy technicznie niewykonalnym lub niespójnym stanie danych,
- stary Engine jest wyłącznie dawcą kodu i materiałem referencyjnym.

## Repo

- `app/` — nowa aplikacja V1,
- `docs/` — kontrakty i blueprinty,
- `legacy/ARGUS_SHOGUN_Engine_v1/` — zamrożony dawca.

## Uruchomienie

```sh
cd app
npm install
npm run dev
```

Pełna kontrola lokalna:

```sh
npm run check
```

## V1

Przepływ pionowy:

`DZISIAJ → PLAN → PRZYGOTOWANIE → MIXER → PODLEWANIE ZAKOŃCZONE → HISTORIA`

Dodatkowe sekcje V1: `DONICE` i podstawowe `TRENDY`.

## Status

- Discovery: LOCK
- Product Contract: v0.2
- UX Blueprint: v0.2
- Control Policy / UNLOCKED: LOCK
- Technical Blueprint: v0.1
- V1 Scope: v0.1
- Vertical Slice: zaimplementowany

> Dane recepturowe w bieżącym seedzie są demonstracyjne. Nie są tabelą producenta i nie wolno ich traktować jako zweryfikowane dawki.
