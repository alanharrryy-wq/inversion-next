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
      safe: qs.get("hiInspectorSafe") === "1",
    };
  } catch {
    return { enabled: false, safe: false };
  }
}
