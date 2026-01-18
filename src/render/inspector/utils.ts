import { getHashSearchParams } from "@/rts/utils/hashQuery";

type InspectorFlags = {
  enabled: boolean;
  safe: boolean;
};

export function getInspectorFlags(): InspectorFlags {
  if (typeof window === "undefined") {
    return { enabled: false, safe: false };
  }
  try {
    const qs = getHashSearchParams();
    return {
      enabled: qs.get("hiInspector") === "1",
      // SAFE MODE DEFAULT:
      // safe = true unless explicitly disabled with hiInspectorSafe=0
      safe: qs.get("hiInspectorSafe") !== "0",
    };
  } catch {
    return { enabled: false, safe: false };
  }
}
