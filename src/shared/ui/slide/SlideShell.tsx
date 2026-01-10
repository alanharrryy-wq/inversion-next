import type { ReactNode } from "react"

import { cn } from "@/shared/lib/cn"

export function SlideShell(props: {
  title?: string
  kicker?: string
  right?: ReactNode
  children: ReactNode
  footerLeft?: ReactNode
  footerRight?: ReactNode

  /** NEW: si false, no renderiza header/footer/card. Ideal para slides “cinematic”. */
  chrome?: boolean

  /** opcional */
  className?: string
}) {
  const chrome = props.chrome !== false

  if (!chrome) {
    return <div className={cn("h-full w-full", props.className)}>{props.children}</div>
  }

  return (
    <div className={cn("h-full w-full p-10", props.className)}>
      <div
        data-material="glassCold"
        className="h-full w-full rounded-[var(--radius-xl)] border border-white/10 bg-white/5 shadow-[var(--shadow-soft)]"
      >
        <div className="grid h-full grid-rows-[auto_1fr_auto]">
          <header className="flex items-start justify-between gap-6 px-10 pt-8">
            <div className="min-w-0">
              {props.kicker ? (
                <div className="text-xs font-medium tracking-wide opacity-75">
                  {props.kicker}
                </div>
              ) : null}
              {props.title ? (
                <div className="mt-2 text-3xl font-semibold leading-tight">
                  {props.title}
                </div>
              ) : null}
            </div>

            {props.right ? <div className="shrink-0">{props.right}</div> : null}
          </header>

          <main className="min-h-0 px-10 py-8">{props.children}</main>

          <footer className="flex items-center justiafy-between gap-4 border-t border-white/10 px-10 py-5 text-xs opacity-75">
            <div>{props.footerLeft ?? <span className="tracking-wide">HITECH</span>}</div>
            <div>
              {props.footerRight ?? <span className="font-mono">1600x900</span>}
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
