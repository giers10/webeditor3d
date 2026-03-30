import type { PropsWithChildren } from "react";

interface PanelProps extends PropsWithChildren {
  title: string;
}

export function Panel({ title, children }: PanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">{title}</div>
      <div className="panel__body">{children}</div>
    </section>
  );
}
