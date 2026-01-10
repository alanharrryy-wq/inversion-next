// src/ui/ExecutiveHeader.tsx
import { Text } from "./Text";
import { Rule } from "./Rule";

export function ExecutiveHeader(props: {
  title: string;
  breadcrumb?: string;
  slideNum?: number;
  rightBadge?: string;
}) {
  const { title, breadcrumb = "HITECH", slideNum, rightBadge } = props;

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <Text variant="kicker">
            {breadcrumb}
            {typeof slideNum === "number" ? (
              <span style={{ marginLeft: 12, opacity: 0.75 }}>
                / SLIDE {String(slideNum).padStart(2, "0")}
              </span>
            ) : null}
          </Text>

          <div style={{ marginTop: 10 }}>
            <Text variant="title" className="font-display">
              {title}
            </Text>
          </div>

          <div style={{ marginTop: 16, maxWidth: 520 }}>
            <Rule />
          </div>
        </div>

        {rightBadge ? (
          <div className="shrink-0">
            <div
              className="vs-panel--soft"
              style={{
                padding: "10px 12px",
                borderRadius: "var(--vs-r-2)",
              }}
            >
              <Text variant="micro" className="font-code" style={{ letterSpacing: "0.24em" }}>
                {rightBadge}
              </Text>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
