# CODE TRANSPLANT CANDIDATES — NOT IMPORTED

Ten katalog nie zawiera skopiowanego kodu produkcyjnego. Rejestruje tylko kandydatów do osobnego review.

## Kandydat A — syringe allocation
Źródło: `legacy/ARGUS_SHOGUN_Engine_v1/src/syringeEngine.ts`

Wartościowe własności:
- deterministyczna alokacja fizycznych instancji,
- jedna instancja narzędzia maksymalnie dla jednego produktu w przygotowanym zestawie,
- tryby PRECISION / SPEED / MIN_TOOLS,
- jawne shortages i usage summary.

Status: `REVIEW_REQUIRED`.

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
