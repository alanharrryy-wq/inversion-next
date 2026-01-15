import { SlideShell } from "@/shared/ui/slide/SlideShell"
import { DataBox, Pill, TextList } from "@/shared/ui/slide/SlideBlocks"
import { BRAND } from "@/shared/config/constants"

export default function Slide00() {
  return (
    <SlideShell
      kicker="Inversion Next"
      title="Deck Engine prearmado"
      right={
        <div className="flex items-center gap-2">
          <Pill label="React" />
          <Pill label="Vite" />
          <Pill label="Tailwind" />
        </div>
      }
      footerRight={
        <span className="font-mono" style={{ color: BRAND.colors.teal600 }}>
          v0.1.0
        </span>
      }
    >
      <div className="grid h-full grid-cols-12 gap-6">
        <div className="col-span-7">
          <DataBox title="Qué es esto">
            <TextList
              items={[
                "SlideShell único para TODAS las slides.",
                "Constantes centralizadas en shared/config/constants.ts.",
                "Design tokens en shared/theme/tokens.css.",
                "Slide registry único con lazy import.",
              ]}
            />
          </DataBox>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <DataBox title="Regla de oro">
              Una slide = una carpeta. Sin duplicados, sin magia rara.
            </DataBox>
            <DataBox title="Objetivo">
              Meter contenido rápido, consistente y visual, sin pelearte con la estructura.
            </DataBox>
          </div>
        </div>

        <div className="col-span-5">
          <DataBox title="Checklist de template">
            <TextList
              items={[
                "index.html + main.tsx conectados",
                "alias @ configurado",
                "puerto fijo 5177 (strict)",
                "router hash para deploy estático",
                "shadcn Button + Dialog listos",
              ]}
            />
          </DataBox>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold">Tip para Codex</div>
            <div className="mt-2 text-sm opacity-90">
              Pídele que genere la slide completa dentro de{" "}
              <span className="font-mono">src/slides/slide-XX</span> y que registre en{" "}
              <span className="font-mono">slideRegistry.ts</span>.
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  )
}
