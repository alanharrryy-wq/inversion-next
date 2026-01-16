import type { ReactNode } from "react"
import "./board.frame.css"

export function BoardFrame(props: { children: ReactNode }) {
    return (
        <div className="board-frame">
            <div className="board-shadow" />

            <div className="board-glass">
                {/* Universo dentro del vidrio */}
                <div className="board-stars" />
                <div className="board-sparkles" />
                <div className="board-motes" />
                <div className="board-glare" />
                <div className="board-noise" />

                {/* contenido real */}
                <div className="board-inner">{props.children}</div>

                {/* reflection */}
                <div className="board-reflection" />
            </div>
        </div>
    )
}
