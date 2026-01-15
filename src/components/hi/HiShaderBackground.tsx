import { useEffect, useRef } from "react"
import { Renderer, Program, Mesh, Triangle } from "ogl"

const vertex = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragment = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
    mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x),
    u.y
  );
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

  float t = uTime * 0.04;

  // “campo de luz” (muy suave)
  float l1 = exp(-length(p - vec2(-0.42, 0.26 + sin(t)*0.03)) * 2.5);
  float l2 = exp(-length(p - vec2(0.48, -0.12 + cos(t)*0.02)) * 3.1);
  float l3 = exp(-length(p - vec2(0.08, -0.52)) * 2.2);

  float field = l1 + l2 * 0.9 + l3 * 0.55;

  vec3 base = vec3(0.028, 0.032, 0.045);
  vec3 steel = vec3(0.075, 0.090, 0.115);
  vec3 cyan = vec3(0.008, 0.655, 0.792); // ~ #02A7CA
  float cyanL = dot(cyan, vec3(0.299, 0.587, 0.114));

  // bloom acumulado (controlado)
  vec3 glow = vec3(cyanL) * field * 0.22;
  vec3 color = mix(base, steel, field * 0.62) + glow;

  // partículas (grano + polvo)
  float g = noise(uv * uResolution.xy * 0.33 + uTime);
  color += (g - 0.5) * 0.030;

  // vignette
  float v = smoothstep(0.98, 0.35, length(uv - 0.5));
  color *= v;

  gl_FragColor = vec4(color, 1.0);
}
`

export default function HiShaderBackground(props: { fixed?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = ref.current
    if (!host) return

    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio, 1.75),
      alpha: true,
    })

    const gl = renderer.gl
    host.appendChild(gl.canvas)
    gl.clearColor(0, 0, 0, 1)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
      },
    })
    const mesh = new Mesh(gl, { geometry, program })

    let raf = 0
    const resize = () => {
      const w = host.clientWidth || window.innerWidth
      const h = host.clientHeight || window.innerHeight
      renderer.setSize(w, h)
      program.uniforms.uResolution.value = [w, h]
    }

    const update = (t: number) => {
      raf = requestAnimationFrame(update)
      program.uniforms.uTime.value = t * 0.001
      renderer.render({ scene: mesh })
    }

    resize()
    window.addEventListener("resize", resize)
    raf = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      try {
        host.removeChild(gl.canvas)
      } catch {
        void 0
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [])

  const isFixed = props.fixed === true

  return (
    <div
      ref={ref}
      className="hi-shader-bg"
      style={{
        position: isFixed ? "fixed" : "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  )
}
