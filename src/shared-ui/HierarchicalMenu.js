import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function clampMenuPosition(position) {
    const horizontalPadding = 12;
    const verticalPadding = 12;
    const estimatedMenuWidth = 300;
    const estimatedMenuHeight = 420;
    return {
        x: Math.max(horizontalPadding, Math.min(position.x, window.innerWidth - estimatedMenuWidth - horizontalPadding)),
        y: Math.max(verticalPadding, Math.min(position.y, window.innerHeight - estimatedMenuHeight - verticalPadding))
    };
}
function renderHierarchicalMenuItems(items, onClose) {
    return items.map((item, index) => {
        if (item.kind === "separator") {
            return _jsx("div", { className: "hierarchical-menu__separator", role: "separator" }, `separator-${index}`);
        }
        if (item.kind === "group") {
            return (_jsxs("details", { className: "hierarchical-menu__group", children: [_jsxs("summary", { className: "hierarchical-menu__group-summary", "data-testid": item.testId, children: [_jsx("span", { className: "hierarchical-menu__group-label", children: item.label }), _jsx("span", { className: "hierarchical-menu__group-chevron", "aria-hidden": "true" })] }), _jsx("div", { className: "hierarchical-menu__children", children: renderHierarchicalMenuItems(item.children, onClose) })] }, `${item.label}-${index}`));
        }
        return (_jsxs("button", { className: "hierarchical-menu__action", type: "button", role: "menuitem", "data-testid": item.testId, disabled: item.disabled, onClick: () => {
                if (item.disabled) {
                    return;
                }
                item.onSelect();
                onClose();
            }, onPointerEnter: () => item.onHoverChange?.(true), onPointerLeave: () => item.onHoverChange?.(false), onFocus: () => item.onHoverChange?.(true), onBlur: () => item.onHoverChange?.(false), children: [_jsx("span", { className: "hierarchical-menu__action-label", children: item.label }), _jsx("span", { className: "hierarchical-menu__action-plus", "aria-hidden": "true", children: "+" })] }, `${item.label}-${index}`));
    });
}
export function HierarchicalMenu({ title, position, items, onClose }) {
    const clampedPosition = clampMenuPosition(position);
    const style = {
        left: `${clampedPosition.x}px`,
        top: `${clampedPosition.y}px`
    };
    return (_jsx("div", { className: "hierarchical-menu__backdrop", onPointerDown: onClose, role: "presentation", children: _jsxs("div", { className: "hierarchical-menu", role: "menu", "aria-label": title, style: style, onPointerDown: (event) => event.stopPropagation(), children: [_jsx("div", { className: "hierarchical-menu__title", children: title }), _jsx("div", { className: "hierarchical-menu__list", children: renderHierarchicalMenuItems(items, onClose) })] }) }));
}
