# CODE TRANSPLANT CANDIDATES

Ten katalog przechowuje wiedzę z przeglądu algorytmów dawcy. Po cleanupie V1 żaden z poniższych kandydatów nie jest częścią aktywnego runtime tylko dlatego, że został technicznie dobrze przepisany.

## Zasada po cleanupie

**Brak aktywnego konsumenta w V1 = brak promocji do `app/src`.**

Dobra implementacja nie jest sama w sobie powodem, żeby rozbudowywać produkt.

## Kandydat A — syringe/tool allocation
Źródło: `legacy/ARGUS_SHOGUN_Engine_v1/src/syringeEngine.ts`

Wartościowe odkrycia z review:
- deterministyczna alokacja fizycznych instancji,
- jedna instancja narzędzia maksymalnie dla jednego produktu,
- jawne shortages i usage summary,
- wykryta luka dawcy: powtarzający się `productId` mógł nadpisać wcześniejsze assignments.

W trakcie transplantacji powstała poprawiona implementacja z agregacją requestów i walidacją tool IDs. Została usunięta z aktywnego `app/src` podczas cleanupu V1, ponieważ nie miała konsumenta w aktualnym flow.

Kod jest zachowany w historii Git oraz branchu:
`archive/pre-v1-cleanup-2026-09-01`.

Dla V1 preferowany jest minimalny mechanizm: **ilość składnika → sugerowana pojemność narzędzia**. Bez liczenia fizycznych sztuk, dopóki realny workflow tego nie wymaga.

Status: `REVIEWED_CANDIDATE_NOT_IN_V1`.

## Kandydat B — recipe pure functions
Źródło: `legacy/ARGUS_SHOGUN_Engine_v1/src/recipeEngine.ts`

Wartościowe odkrycia z review:
- strict context filter,
- stabilne sortowanie,
- wykrywanie duplikatów i niepoprawnych liczb,
- polityka kolejności powinna być wstrzykiwana, nie zaszyta,
- issues nie powinny automatycznie oznaczać UI gate.

Powstały `recipeKernel.ts` był technicznie poprawny po poprawkach, ale nie miał konsumenta w działającym V1. Został wycofany z `app/src`, a wiedza pozostaje tutaj.

Status: `REVIEWED_CANDIDATE_NOT_IN_V1`.

## Kandydat C — mixing/checkpoint policy
Źródło: `legacy/ARGUS_SHOGUN_Engine_v1/src/recipeEngine.ts`

Audyt źródłowy pozostaje w:
`transplant/review/mixing-policy-audit.md`.

Review wykazał, że pełny donor role chain nie ma wystarczającego uzasadnienia jako jedna kanoniczna kolejność. Część reguł ma lepsze wsparcie dowodowe, ale po cleanupie również one pozostają poza runtime do chwili, gdy konkretny ekran V1 będzie ich faktycznie potrzebował.

Status: `REVIEWED_CANDIDATE_NOT_IN_V1`.
