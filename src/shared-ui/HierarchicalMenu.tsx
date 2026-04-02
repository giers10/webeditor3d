import type { CSSProperties, PropsWithChildren } from "react";

export type HierarchicalMenuPosition = {
  x: number;
  y: number;
};

export type HierarchicalMenuItem =
  | {
      kind: "action";
      label: string;
      onSelect: () => void;
      testId?: string;
      disabled?: boolean;
    }
  | {
      kind: "group";
      label: string;
      testId?: string;
      children: HierarchicalMenuItem[];
    }
  | {
      kind: "separator";
    };

interface HierarchicalMenuProps extends PropsWithChildren {
  title: string;
  position: HierarchicalMenuPosition;
  items: HierarchicalMenuItem[];
  onClose(): void;
}

function clampMenuPosition(position: HierarchicalMenuPosition): HierarchicalMenuPosition {
  const horizontalPadding = 12;
  const verticalPadding = 12;
  const estimatedMenuWidth = 300;
  const estimatedMenuHeight = 420;

  return {
    x: Math.max(horizontalPadding, Math.min(position.x, window.innerWidth - estimatedMenuWidth - horizontalPadding)),
    y: Math.max(verticalPadding, Math.min(position.y, window.innerHeight - estimatedMenuHeight - verticalPadding))
  };
}

function renderHierarchicalMenuItems(items: HierarchicalMenuItem[], onClose: () => void): React.ReactNode {
  return items.map((item, index) => {
    if (item.kind === "separator") {
      return <div key={`separator-${index}`} className="hierarchical-menu__separator" role="separator" />;
    }

    if (item.kind === "group") {
      return (
        <details key={`${item.label}-${index}`} className="hierarchical-menu__group">
          <summary className="hierarchical-menu__group-summary" data-testid={item.testId}>
            <span className="hierarchical-menu__group-label">{item.label}</span>
            <span className="hierarchical-menu__group-chevron" aria-hidden="true" />
          </summary>
          <div className="hierarchical-menu__children">{renderHierarchicalMenuItems(item.children, onClose)}</div>
        </details>
      );
    }

    return (
      <button
        key={`${item.label}-${index}`}
        className="hierarchical-menu__action"
        type="button"
        role="menuitem"
        data-testid={item.testId}
        disabled={item.disabled}
        onClick={() => {
          if (item.disabled) {
            return;
          }

          item.onSelect();
          onClose();
        }}
      >
        <span className="hierarchical-menu__action-label">{item.label}</span>
        <span className="hierarchical-menu__action-plus" aria-hidden="true">
          +
        </span>
      </button>
    );
  });
}

export function HierarchicalMenu({ title, position, items, onClose }: HierarchicalMenuProps) {
  const clampedPosition = clampMenuPosition(position);
  const style: CSSProperties = {
    left: `${clampedPosition.x}px`,
    top: `${clampedPosition.y}px`
  };

  return (
    <div className="hierarchical-menu__backdrop" onPointerDown={onClose} role="presentation">
      <div className="hierarchical-menu" role="menu" aria-label={title} style={style} onPointerDown={(event) => event.stopPropagation()}>
        <div className="hierarchical-menu__title">{title}</div>
        <div className="hierarchical-menu__list">{renderHierarchicalMenuItems(items, onClose)}</div>
      </div>
    </div>
  );
}
