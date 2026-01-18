# 📐 ARCHITECTURE_CONTRACT.md
## Hitech Render Architecture Contract

Fecha: 2026-01-16  
Estado: ACTIVO / OBLIGATORIO  

---

## 🧠 Principio base

> Las cosas no solo importan por lo que hacen, sino por **DÓNDE viven**.

El sistema está dividido en **capas claras**.  
Romper una capa = romper estabilidad, reutilización o performance.

---

## 🧱 CAPA 1 — MATERIALES (lo físico)

### 📍 Dónde vive
- hi-materials.css
- tokens.css
- board.frame.css
- assets visuales (noise, blur, grain, stars, textures)

### 🧩 Qué va aquí
- Glass
- Glow
- Rim light
- Grain / noise
- Blur (como material, no como decisión)
- Sombras estéticas

### 🚫 Qué NO sabe esta capa
- Nada de React
- Nada de slides
- Nada de estado
- Nada de UX

### 🧠 Regla de oro
> Si mañana borras toda la app, **esto debería seguir siendo reutilizable**.

---

## 🎭 CAPA 2 — SISTEMA / RENDER

### 📍 Dónde vive
- src/render/**
- src/shared/render/**
- src/shared/ui/**

### 🧩 Qué va aquí
- Cómo se monta un panel
- Qué material visual usa
- Safe Mode
- Aislamiento (contain, isolation)
- Capas (::before, ::after)
- Wrappers estructurales

### 🚫 Qué NO va aquí
- Decisiones de negocio
- “En este slide quiero glass”
- Hacks visuales por urgencia

### 🧠 Regla de oro
> Aquí se **ORQUESTA**, no se inventa.

---

## 🎬 CAPA 3 — APP / UX

### 📍 Dónde vive
- src/app/**
- routes
- slides
- dashboards

### 🧩 Qué va aquí
- Qué slide usa qué panel
- Cuándo se activa un efecto
- Decisiones de UX
- Lectura del inventory

### 🚫 Qué NO va aquí
- CSS nuevo de efectos
- Blur inline
- Glass “rápido”
- Hacks visuales

### 🧠 Regla de oro
> App **ELIGE**, no CREA.

---

## ❌ Anti-patrón universal (PROHIBIDO)

```css
/* src/app/Slide02.css */
.panel {
  backdrop-filter: blur(12px); /* ❌ ILEGAL */
}
