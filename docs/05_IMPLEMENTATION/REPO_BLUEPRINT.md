# REPO BLUEPRINT

```text
/
├── README.md
├── app/
│   ├── public/
│   ├── src/
│   │   ├── data/
│   │   ├── domain/
│   │   ├── screens/
│   │   └── store/
│   └── package.json
├── docs/
│   ├── 00_DISCOVERY/
│   ├── 01_PRODUCT/
│   ├── 02_UX/
│   ├── 03_TECHNICAL/
│   ├── 04_V1_SCOPE/
│   └── 05_IMPLEMENTATION/
└── legacy/
    └── ARGUS_SHOGUN_Engine_v1/
```

## Reguły

1. Nowy kod produkcyjny trafia tylko do `app/`.
2. `legacy/` jest read-only z punktu widzenia projektowania.
3. Nie importujemy modułów bezpośrednio z `legacy/`.
4. Każdy portowany dawca dostaje test zachowania.
5. Dane recepturowe i engine są rozdzielone.
6. Hard-blocki są własnością walidacji technicznej, nie warstwy rekomendacji.
