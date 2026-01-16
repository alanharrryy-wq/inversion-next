import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RenderInspectorPanel } from "./RenderInspectorPanel";
import { getInspectorFlags } from "./utils";

let cssLoadPromise: Promise<void> | null = null;

function ensureInspectorCssLoaded(): Promise<void> {
  if (!cssLoadPromise) {
    cssLoadPromise = import("./inspector.css").then(() => undefined);
  }
  return cssLoadPromise;
}

export function RenderInspectorHost() {
  // Solo DEV
  const isDev = import.meta.env.DEV;
  const [flags, setFlags] = useState(() => getInspectorFlags());
  const [cssReady, setCssReady] = useState(false);

  useEffect(() => {
    if (!isDev || typeof window === "undefined") return;
    const onHash = () => setFlags(getInspectorFlags());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [isDev]);

  useEffect(() => {
    if (!isDev || !flags.enabled) return;
    let alive = true;
    void ensureInspectorCssLoaded().then(() => {
      if (alive) setCssReady(true);
    });
    return () => {
      alive = false;
    };
  }, [isDev, flags.enabled]);

  if (!isDev || !flags.enabled || !cssReady) return null;
  if (typeof document === "undefined") return null;

  return createPortal(<RenderInspectorPanel safe={flags.safe} />, document.body);
}
