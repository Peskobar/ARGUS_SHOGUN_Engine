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
- stabilne sortowanie przy jawnie dostarczonej polityce roli / `mixOrder`,
- wykrywanie duplikatów i niepoprawnych liczb.

Nowa implementacja:
- `app/src/domain/recipeKernel.ts`,
- filtr metody jest ścisły i nie używa wildcardów,
- `mixOrder` ma pierwszeństwo przed polityką roli,
- równe order zachowują source order,
- walidacja zwraca `issues` bez `severity` i bez decyzji UI,
- nie posiada wbudowanej kolejności ról,
- polityka kolejności musi zostać jawnie wstrzyknięta przez caller,
- nie tworzy checkpointów procesu.

Celowo odrzucono z dawcy:
- severity ERROR jako blokadę operatorską,
- inventory shortage jako domenowy hard-stop,
- `RECIPE_CONFLICT` jako bezwarunkowy UI lock,
- zaszytą domyślną mixing policy przed jej osobnym review.

Status: `PROMOTED_ALGORITHM`.

## Kandydat C — mixing/checkpoint policy
Źródło: `legacy/ARGUS_SHOGUN_Engine_v1/src/recipeEngine.ts`

Audyt: `transplant/review/mixing-policy-audit.md`.

Po audycie producenta polityka została rozcięta. Promowano wyłącznie:
- carrier water first,
- no concentrate premix,
- Silicon before base,
- Terra Grow XOR Terra Bloom,
- końcową checklistę pH + EC bez narzuconej kolejności między pomiarami,
- separację checkpointów ROOT_FEED od innych metod jako invariant architektoniczny.

Nie promowano:
- CALMAG -> BASE,
- BASE -> ROOTS,
- ROOTS -> ENZYME,
- ENZYME -> BOOSTER,
- BOOSTER -> PK,
- pełnego donor role chain.

Runtime: `app/src/domain/mixingPolicy.ts`.

Status: `PARTIALLY_PROMOTED`.
