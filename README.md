# Inversion Next (Deck Engine)

Plantilla prearmada para presentaciones web tipo slide deck: rápida, consistente y lista para meterle Codex en putiza.

## Arranque
```bash
npm i
npm run dev
```

Abre: `http://localhost:5177/#/deck`

## Convenciones
### Agregar una slide
1) Crea carpeta: `src/slides/slide-XX/`
2) Crea:
- `src/slides/slide-XX/ui/SlideXX.tsx`
- `src/slides/slide-XX/index.ts` (exporta `meta` y `default`)
3) Registra en: `src/app/deck/slideRegistry.ts`

### Archivos clave
- Constantes: `src/shared/config/constants.ts`
- Tokens de estilo: `src/shared/theme/tokens.css`
- Machote base: `src/shared/ui/slide/SlideShell.tsx`
- Orquestador: `src/pages/deck/DeckPage.tsx`
