import type { ReactNode } from "react"
import { DECK } from "@/shared/config/constants"

export function SlideShell(props: {
  title?: string
  kicker?: string
  right?: ReactNode
  children: ReactNode
  footerLeft?: ReactNode
  footerRight?: ReactNode
}) {
  return (
    <div className="h-full w-full p-10">
      <div className="h-full w-full rounded-[var(--radius-xl)] border border-white/10 bg-white/5 shadow-[var(--shadow-soft)]">
        <div className="grid h-full grid-rows-[auto_1fr_auto]">
          <header className="flex items-start justify-between gap-6 px-10 pt-8">
            <div className="min-w-0">
              {props.kicker ? <div className="text-xs font-medium tracking-wide opacity-75">{props.kicker}</div> : null}
              {props.title ? <div className="mt-2 text-3xl font-semibold leading-tight">{props.title}</div> : null}
            </div>
            {props.right ? <div className="shrink-0">{props.right}</div> : null}
          </header>

          <main className="min-h-0 px-10 py-8">{props.children}</main>

          <footer className="flex items-center justify-between gap-4 border-t border-white/10 px-10 py-5 text-xs opacity-75">
            <div>{props.footerLeft ?? <span>{DECK.appName}</span>}</div>
            <div>{props.footerRight ?? <span className="font-mono">1600x900</span>}</div>
          </footer>
        </div>
      </div>
    </div>
  )
}
