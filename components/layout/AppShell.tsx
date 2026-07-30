import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number | string;
  compact?: boolean;
  fullHeight?: boolean;
  className?: string;
  panelClassName?: string;
};

export default function AppShell({
  children,
  footer,
  maxWidth = 720,
  compact = false,
  fullHeight = false,
  className = "",
  panelClassName = "",
}: AppShellProps) {
  const resolvedMaxWidth =
    typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

  const shellClassNames = [
    "tonari-shell",
    fullHeight ? "tonari-app-shell-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const panelClassNames = [
    "tonari-panel",
    "tonari-app-panel",
    compact ? "tonari-app-panel-compact" : "",
    fullHeight ? "tonari-app-panel-full" : "",
    panelClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="tonari-page">
      <section
        className={shellClassNames}
        style={{ maxWidth: resolvedMaxWidth }}
      >
        <div className={panelClassNames}>{children}</div>

        {footer ?? (
          <p className="tonari-footer-copy">
            今日が、一番若い二人の日。
          </p>
        )}
      </section>
    </main>
  );
}