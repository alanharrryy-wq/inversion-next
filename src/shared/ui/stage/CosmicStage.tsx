import type { ReactNode } from "react"
import { cn } from "@/shared/lib/cn"
import "./cosmic.stage.css"

export function CosmicStage(props: {
    children: ReactNode
    grade?: "contrast" | "soft"
    className?: string
}) {
    return (
        <div className={cn("cosmic-stage", props.className)} data-hi-grade={props.grade ?? "contrast"}>
            {/* Layers back -> front */}
            <div className="cosmic-layer cosmic-base" />
            <div className="cosmic-layer cosmic-nebula cosmic-drift" />
            <div className="cosmic-layer cosmic-stars" />
            <div className="cosmic-layer cosmic-stars cosmic-stars-2" />
            <div className="cosmic-layer cosmic-fatstars cosmic-twinkle" />
            <div className="cosmic-layer cosmic-sparkle" />
            <div className="cosmic-layer cosmic-dust" />
            <div className="cosmic-layer cosmic-haze" />
            <div className="cosmic-layer cosmic-bloom" />
            <div className="cosmic-layer cosmic-vignette" />
            <div className="cosmic-layer cosmic-grain" />

            {/* Content (scaled board goes here) */}
            <div className="cosmic-content">{props.children}</div>
        </div>
    )
}
