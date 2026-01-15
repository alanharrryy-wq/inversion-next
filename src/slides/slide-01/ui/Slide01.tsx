import { SlideShell } from "@/shared/ui/slide/SlideShell"
import { DataBox, TextList } from "@/shared/ui/slide/SlideBlocks"
export default function Slide01() {
  return (
    <SlideShell kicker="Deck" title="Agenda (ejemplo)">
      <div className="grid h-full grid-cols-12 gap-6">
        <div className="col-span-6">
          <section data-material="glassCritical" data-glint="red">
          <DataBox title="Hoy">
            <TextList items={["Qué construimos", "Reglas de estructura", "Cómo agregar slides", "Cómo exportar"]} />
          </DataBox>
          </section>
        </div>
        <div className="col-span-6">
          <DataBox title="Mañana">
            <TextList items={["Flagships", "KPI dashboards", "Evidencias", "Módulos plug-in"]} />
          </DataBox>
        </div>
      </div>
    </SlideShell>
  )
}
