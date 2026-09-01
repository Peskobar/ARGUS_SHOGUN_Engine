# CONTROL POLICY — PRO / STANDARD / UNLOCKED

Status: **LOCK**

## Wspólna zasada

Poziom kontroli zmienia ilość i szczegółowość pomocy. Nie zmienia praw operatora do wykonania poprawnej technicznie operacji.

## PRO

- pełne ostrzeżenia,
- wyjaśnienie przyczyny,
- pokazanie alternatywy,
- dodatkowy kontekst decyzji.

## STANDARD

- krótkie ostrzeżenia istotne dla bieżącej czynności,
- bez nadmiaru objaśnień.

## UNLOCKED

- minimalna warstwa ostrzeżeń,
- żadnych domenowych hard-blocków,
- wykonanie dostępne mimo rekomendacji ARGUS,
- override jest zapisywany w historii, jeśli dotyczy ostrzeżenia.

## Hard-block techniczny

Dopuszczalny tylko dla stanu, którego nie można bezpiecznie przeliczyć lub zapisać:

- invalid number,
- ujemna / zerowa objętość partii,
- niepoprawna dawka,
- brak wybranego planu przy wykonaniu,
- duplikaty ID składników w jednej operacji,
- błąd persistence.

UI ma wtedy powiedzieć **co jest technicznie niepoprawne**, zamiast udawać decyzję ekspercką.
