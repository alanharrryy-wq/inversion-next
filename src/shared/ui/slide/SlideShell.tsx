import * as React from "react"
import { cn } from "@/shared/lib/cn"

export function SlideShell(props: {
  title?: string
  kicker?: string
  footerLeft?: React.ReactNode
  footerRight?: React.ReactNode
  className?: string
  chrome?: boolean
  children: React.ReactNode
}) {
  const chrome = props.chrome !== false

  return (
    <div className="hi-stage relative h-full w-full p-10">
      {/* STAGE CLEAN WRAPPER (no blur/filter/mix-blend/heavy shadows) */}
      <div className="relative h-full w-full overflow-hidden rounded-[28px]">
        {/* UI WRAPPER (todo lo caro vive aquí) */}
        <div className={cn("hi-ui relative h-full w-full", props.className)}>
          {chrome ? (
            <div className="hi-shell relative flex h-full flex-col">
              <header className="flex items-start justify-between px-8 pt-7">
                <div>
                  {props.kicker ? (
                    <div className="text-xs tracking-[0.25em] opacity-70">{props.kicker}</div>
                  ) : null}
                  {props.title ? (
                    <div className="mt-2 text-2xl font-semibold tracking-tight">{props.title}</div>
                  ) : null}
                </div>
                <div className="text-xs opacity-60">Deck</div>
              </header>

              <main className="flex-1 px-8 pb-7 pt-6">{props.children}</main>

              <footer className="flex items-center justify-between px-8 pb-7 text-xs opacity-70">
                <div>{props.footerLeft}</div>
                <div>{props.footerRight}</div>
              </footer>
            </div>
          ) : (
            <div className="relative h-full w-full">{props.children}</div>
          )}
        </div>
      </div>
    </div>
  )
}
