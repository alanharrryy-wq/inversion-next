import { Button } from "@/components/ui/button"

export function SlideNav(props: {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  const atStart = props.index <= 0
  const atEnd = props.index >= props.total - 1

  return (
    <div className="flex items-center gap-2">
      <Button data-deck-prev variant="secondary" size="sm" onClick={props.onPrev} disabled={atStart}>
        ← Prev
      </Button>
      <Button data-deck-next variant="default" size="sm" onClick={props.onNext} disabled={atEnd}>
        Next →
      </Button>
    </div>
  )
}
