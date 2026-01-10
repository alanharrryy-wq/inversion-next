import { ProblemSolutionTemplate } from "@/rts/slides/templates"

export function Slide03() {
  return (
    <ProblemSolutionTemplate
      title="Problem / Context"
      breadcrumb="RTS BLOCK 2"
      slideNum={3}
      problem="Evidence is scattered across tools, review cycles are slow, and risk language varies by team. The current workflow makes it hard to move from signal to decision with confidence."
      solution="Create a single narrative spine that aligns owners, evidence, and decisions. Block 2 focuses on a shared context so every review starts from the same facts."
      risks={[
        "Fragmented ownership delays approvals.",
        "Evidence trails are inconsistent across teams.",
        "Priority shifts without a shared risk vocabulary.",
      ]}
    />
  )
}

export default Slide03
