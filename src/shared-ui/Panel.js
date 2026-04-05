import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useState } from "react";
export function Panel({ title, children, defaultExpanded = true }) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const bodyId = useId();
    return (_jsxs("section", { className: `panel ${isExpanded ? "" : "panel--collapsed"}`, children: [_jsxs("button", { className: "panel__header", type: "button", "aria-expanded": isExpanded, "aria-controls": bodyId, onClick: () => setIsExpanded((expanded) => !expanded), children: [_jsx("span", { className: `panel__chevron ${isExpanded ? "panel__chevron--expanded" : ""}`, "aria-hidden": "true" }), _jsx("span", { children: title })] }), isExpanded ? (_jsx("div", { className: "panel__body", id: bodyId, children: children })) : null] }));
}
