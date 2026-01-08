import { Link } from "react-router-dom"

export function NotFoundPage() {
  return (
    <div className="grid min-h-svh place-items-center p-6">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-xl font-semibold">404</div>
        <div className="mt-2 opacity-80">Esa ruta no existe.</div>
        <Link className="mt-4 inline-block underline underline-offset-4" to="/deck">
          Ir al deck
        </Link>
      </div>
    </div>
  )
}
