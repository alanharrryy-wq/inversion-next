export default function HiFilters() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        {/* Vidrio: warp MUY leve + haze óptico. Aplicar solo en overlay, no al texto */}
        <filter id="hi-glass-warp" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="8" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" result="warp" />
          <feGaussianBlur in="warp" stdDeviation="0.55" result="haze" />
          <feColorMatrix
            in="haze"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 1.08 0
            "
            result="hazeBoost"
          />
          <feBlend in="warp" in2="hazeBoost" mode="screen" />
        </filter>

        {/* Bloom suave: para charts, rings y glints (no neon gamer) */}
        <filter id="hi-soft-bloom" x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.25" result="b0" />
          <feColorMatrix
            in="b0"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.60 0
            "
            result="b1"
          />
          <feMerge>
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}
