import { HashRouter, Navigate, Route, Routes } from "react-router-dom"
import { Providers } from "@/app/providers/Providers"
import { DeckPage } from "@/pages/deck/DeckPage"
import { NotFoundPage } from "@/pages/not-found/NotFoundPage"

export function App() {
  return (
    <Providers>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/deck" replace />} />
          <Route path="/deck" element={<DeckPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </HashRouter>
    </Providers>
  )
}
