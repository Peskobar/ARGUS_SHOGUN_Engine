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

Do rozważenia po odcięciu starej semantyki gate:
- strict context filter,
- stabilne sortowanie po role/mixOrder,
- wykrywanie duplikatów i niepoprawnych liczb,
- jawne rozdzielenie product steps od process checkpoints.

Nie przenosić automatycznie:
- severity ERROR jako blokady operatorskiej,
- inventory shortage jako domenowego hard-stop,
- `RECIPE_CONFLICT` jako bezwarunkowego UI lock w trybie UNLOCKED.

Status: `REVIEW_REQUIRED`.
