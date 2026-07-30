import type { ReactNode } from "react";

type TopBarProps = {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  center?: ReactNode;
};

export default function TopBar({
  title = "となり",
  left,
  right,
  center,
}: TopBarProps) {
  return (
    <header className="tonari-topbar">
      <div className="tonari-topbar-side">
        {left}
      </div>

      <div className="tonari-topbar-center">
        {center ?? (
          <p className="tonari-brand">
            {title}
          </p>
        )}
      </div>

      <div className="tonari-topbar-side tonari-topbar-side-right">
        {right}
      </div>
    </header>
  );
}