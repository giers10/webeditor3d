import { useId, useState, type PropsWithChildren } from "react";

interface PanelProps extends PropsWithChildren {
  title: string;
  defaultExpanded?: boolean;
}

export function Panel({ title, children, defaultExpanded = true }: PanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const bodyId = useId();

  return (
    <section className={`panel ${isExpanded ? "" : "panel--collapsed"}`}>
      <button
        className="panel__header"
        type="button"
        aria-expanded={isExpanded}
        aria-controls={bodyId}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <span className={`panel__chevron ${isExpanded ? "panel__chevron--expanded" : ""}`} aria-hidden="true" />
        <span>{title}</span>
      </button>
      {isExpanded ? (
        <div className="panel__body" id={bodyId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
