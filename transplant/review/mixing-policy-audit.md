# MIXING POLICY AUDIT v0.1

Data audytu: 2026-09-01

Cel: rozdzielić reguły dawcy na: POTWIERDZONE, CZĘŚCIOWO POTWIERDZONE, NIEPOTWIERDZONE i ODRZUCONE. Ten dokument nie jest recepturą i nie zawiera dawek produkcyjnych.

## Źródło dawcy

`legacy/ARGUS_SHOGUN_Engine_v1/src/recipeEngine.ts`

Donor role order:

`SILICON -> CALMAG -> BASE -> ROOTS -> ENZYME -> BOOSTER -> PK -> BIOLOGICAL -> READY_TO_USE -> OTHER -> PH_ADJUSTER`

Donor ROOT_FEED checkpoints:

`WATER_START -> products -> POST_SILICON_PH -> FINAL_EC -> FINAL_PH`

## Źródła zewnętrzne użyte do audytu

Oficjalne strony producenta SHOGUN Fertilisers:

- https://www.shogunfertilisers.com/products/silicon
- https://www.shogunfertilisers.com/products/calmag
- https://www.shogunfertilisers.com/products/samurai-terra
- https://www.shogunfertilisers.com/products/katana-roots
- https://www.shogunfertilisers.com/products/zenzym
- https://www.shogunfertilisers.com/products/sumo-active-boost
- https://www.shogunfertilisers.com/products/pk-warrior-9-18

## Werdykt reguł

### VERIFIED: no_concentrate_premix

Producent wielokrotnie instruuje, aby nie mieszać skoncentrowanych produktów bezpośrednio ze sobą i zawsze dodawać je do wody.

Status: `PROMOTABLE_POLICY`.

### VERIFIED: carrier_water_first

Instrukcje produktowe rozpoczynają procedurę od odmierzonej ilości wody w zbiorniku / konewce / reservoir.

Status: `PROMOTABLE_POLICY`.

### VERIFIED: silicon_special_handling_before_base

Producent wyraźnie instruuje, aby Silicon przygotować osobno w wodzie, skorygować pH przed dodaniem do zbiornika oraz obniżyć pH przed dodaniem nawozu bazowego.

Wniosek: relacja `SILICON -> BASE` jest potwierdzona. Nie oznacza to automatycznie pełnej kolejności wszystkich pozostałych dodatków.

Status: `PROMOTABLE_POLICY`.

### VERIFIED: terra_grow_xor_bloom

Producent Samurai Terra podaje, że Grow i Bloom nie powinny znajdować się w tej samej mieszance.

Status: `PROMOTABLE_POLICY`.

### VERIFIED: final_measurement_checklist

Producent na stronach produktowych zaleca kontrolę pH i EC gotowego roztworu.

Uwaga: źródła nie ustanawiają wystarczająco jednoznacznej globalnej kolejności `EC -> pH`. Dlatego runtime powinien modelować oba jako końcowe pomiary/checklistę, bez narzucania kolejności między nimi.

Status: `PROMOTABLE_POLICY`.

### PARTIAL: mix_after_addition

Instrukcje poszczególnych produktów nakazują dokładne wymieszanie roztworu po dodaniu danego produktu. Jest to silne wsparcie dla reguły `mix after addition`, ale nie ustanawia jednej globalnej sekwencji wszystkich produktów.

Status: `PROMOTABLE_ADVISORY`.

### UNVERIFIED: CALMAG before BASE

Nie znaleziono jednoznacznej oficjalnej reguły producenta ustanawiającej globalną relację `CALMAG -> BASE`.

Status: `DO_NOT_PROMOTE`.

### UNVERIFIED: BASE before ROOTS

Nie znaleziono jednoznacznej oficjalnej reguły producenta ustanawiającej globalną relację `BASE -> ROOTS`.

Status: `DO_NOT_PROMOTE`.

### UNVERIFIED: ROOTS before ENZYME

Nie znaleziono jednoznacznej oficjalnej reguły producenta ustanawiającej globalną relację `ROOTS -> ENZYME`.

Status: `DO_NOT_PROMOTE`.

### UNVERIFIED: ENZYME before BOOSTER

Nie znaleziono jednoznacznej oficjalnej reguły producenta ustanawiającej globalną relację `ENZYME -> BOOSTER`.

Status: `DO_NOT_PROMOTE`.

### UNVERIFIED: BOOSTER before PK

Producent opisuje kompatybilność / synergię Sumo i PK Warrior, ale nie ustanawia jednoznacznie globalnej kolejności `BOOSTER -> PK`.

Status: `DO_NOT_PROMOTE`.

### REJECTED AS DEFAULT: full donor role chain

Pełny donor role order nie ma wystarczającego oparcia w oficjalnych źródłach. Może pozostać historycznym kandydatem, ale nie może zostać domyślną polityką nowego Engine.

Status: `REJECTED_DEFAULT`.

### ARCHITECTURAL: non_root_feed_no_root_checkpoints

To nie jest twierdzenie producenta, tylko zasada separacji domeny: metoda inna niż `ROOT_FEED` nie dziedziczy automatycznie checkpointów specyficznych dla ROOT_FEED.

Status: `PROMOTABLE_ARCHITECTURAL_INVARIANT`.

## Zasada dla runtime

Nowy Engine może używać wyłącznie polityk oznaczonych `PROMOTABLE_*`. Nie wolno rekonstruować pełnej kolejności z wag dawcy ani z kolejności elementów w starych tablicach.

W trybie `UNLOCKED` polityki domenowe są informacją/advisory. Twarde zatrzymanie może dotyczyć wyłącznie technicznej niewykonalności danych, nie niezgodności z preferowaną kolejnością produktu.
