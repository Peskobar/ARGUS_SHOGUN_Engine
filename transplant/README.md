# ARGUS SHOGUN — TRANSPLANT STAGING

Ten katalog izoluje dane wybrane ze starego `ARGUS_SHOGUN_Engine_v1` przed świadomym przeszczepem do nowej aplikacji.

## Zasada

Nic z `transplant/` nie jest automatycznie danymi produkcyjnymi.
Każdy pakiet ma status i pochodzenie. Dopiero jawna promocja przenosi dane do `app/src/data/` lub reguły do `app/src/domain/`.

## Statusy

- `READY_STRUCTURE` — struktura/tożsamość może być mapowana do nowego modelu bez dziedziczenia starej architektury.
- `NEEDS_OPERATOR_CONFIRMATION` — dane opisują fizyczny stan/zestaw i wymagają potwierdzenia.
- `REVIEW_REQUIRED` — sensowny kandydat, ale wymaga audytu domenowego lub źródłowego.
- `QUARANTINED_UNVERIFIED` — nie wolno użyć jako zweryfikowanej prawdy ani zasilać planów V1.

## Wybrane

1. `candidates/domain-taxonomy.json` — słownik domeny.
2. `candidates/product-identities.json` — stabilne identyfikatory i nazwy produktów bez stanów magazynowych i dawek.
3. `candidates/physical-tools.json` — dawny zestaw strzykawek/pipet, wyłącznie do potwierdzenia.
4. `candidates/mixing-policy.json` — dawna kolejność ról i checkpointy, do audytu przed promocją.

## Kwarantanna

1. `quarantine/unverified-recipes.json` — wszystkie stare receptury/dawki z `verificationStatus=UNVERIFIED`.
2. `quarantine/product-claims.json` — kompatybilność medium, foliarAllowed oraz legacy stock/capacity.

## Celowo NIE przeszczepiono

- `App.tsx` i starego UI,
- `store.ts`, localStorage schema i starego DEFAULT_STATE,
- starego gate modelu / semantyki blokowania,
- starego CI i konfiguracji aplikacji,
- kolorów Tailwind jako części danych domenowych,
- wartości `remainingCapacity` jako aktualnego magazynu operatora,
- genericznych opisów źródeł typu `SHOGUN Feedchart` jako dowodu weryfikacji,
- algorytmów jako danych. `syringeEngine.ts` i czyste funkcje z `recipeEngine.ts` są osobnym kandydatem do późniejszego code transplant review.

## Pochodzenie

Donor: `legacy/ARGUS_SHOGUN_Engine_v1/`
Oryginalny donor main: `cfbb3e2e48f89b61441555d7c8eac3dec6ab44cf`
Ekstrakcja wykonana: 2026-09-01
