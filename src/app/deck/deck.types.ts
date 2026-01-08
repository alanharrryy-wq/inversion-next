import type { LazyExoticComponent } from "react"
import type { SlideProps } from "@/entities/slide/model/slide.types"

export type SlideMeta = {
  id: string
  title: string
  tags?: string[]
}

export type SlideEntry = {
  meta: SlideMeta
  Component: LazyExoticComponent<(props: SlideProps) => JSX.Element>
}
