# CODE TRANSPLANT CANDIDATES

Ten katalog rejestruje kandydatów do transplantacji oraz ich stan review. Kod produkcyjny trafia wyłącznie do `app/src` po świadomym przepisaniu i testach.

## Kandydat A — syringe/tool allocation
Źródło: `legacy/ARGUS_SHOGUN_Engine_v1/src/syringeEngine.ts`

Wartościowe własności dawcy:
- deterministyczna alokacja fizycznych instancji,
- jedna instancja narzędzia maksymalnie dla jednego produktu w przygotowanym zestawie,
- tryby PRECISION / SPEED / MIN_TOOLS,
- jawne shortages i usage summary.

Wykryta luka dawcy:
- powtarzający się `productId` mógł nadpisać wcześniejsze assignments, mimo że narzędzia zostały już zużyte.

Nowa implementacja:
- `app/src/domain/toolAllocator.ts`,
- agreguje powtarzające się requesty przed alokacją,
- waliduje requesty i tool types,
- wykrywa duplicate tool IDs,
- nie importuje fizycznej listy strzykawek z dawcy,
- nie zna receptur, dawek, UI, magazynu ani gate modelu.

Status: `PROMOTED_ALGORITHM`.

## Kandydat B — recipe pure functions
Źródło: `legacy/ARGUS_SHOGUN_Engine_v1/src/recipeEngine.ts`

Wartościowe własności dawcy:
- strict context filter,
- stabilne sortowanie po roli / `mixOrder`,
- wykrywanie duplikatów i niepoprawnych liczb.

Nowa implementacja:
- `app/src/domain/recipeKernel.ts`,
- filtr metody jest ścisły i nie używa wildcardów,
- `mixOrder` ma pierwszeństwo przed role order,
- równe order zachowują source order,
- walidacja zwraca `issues` bez `severity` i bez decyzji UI,
- nie tworzy checkpointów procesu i nie importuje mixing policy przed osobnym review.

Celowo odrzucono z dawcy:
- severity ERROR jako blokadę operatorską,
- inventory shortage jako domenowy hard-stop,
- `RECIPE_CONFLICT` jako bezwarunkowy UI lock.

Status: `PROMOTED_ALGORITHM`.

## Kandydat C — mixing/checkpoint policy
Źródło: `legacy/ARGUS_SHOGUN_Engine_v1/src/recipeEngine.ts`

To osobna warstwa od recipe kernel. Kolejność ról i checkpointy procesu pozostają danymi/polityką wymagającą osobnego review przed użyciem operatorskim.

Status: `REVIEW_REQUIRED`.
