import { SlideShell } from "@/shared/ui/slide/SlideShell"

export default function Slide08() {
  return (
    <SlideShell
      chrome={false}
      rig="night-studio"
      grade="contrast"
      className="relative h-full w-full overflow-hidden"
      data-slide="slide-08"
    >
      {/* Backdrop placeholder (space vibe) */}
      <div className="absolute inset-0 [background:radial-gradient(1200px_700px_at_60%_35%,rgba(255,255,255,0.06),transparent_60%)]" />
      <div className="absolute inset-0 opacity-70 [background:radial-gradient(900px_500px_at_30%_70%,rgba(2,167,202,0.12),transparent_60%)]" />

      {/* Glass hero placeholder */}
      <div className="absolute left-[9%] top-[12%] h-[70%] w-[82%] rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-0 rounded-[28px] opacity-70 [background:linear-gradient(135deg,rgba(255,255,255,0.16),transparent_35%,transparent_65%,rgba(255,255,255,0.08))]" />
        <div className="absolute inset-[10px] rounded-[22px] bg-black/25 backdrop-blur-[10px]" />
      </div>
    </SlideShell>
  )
}
