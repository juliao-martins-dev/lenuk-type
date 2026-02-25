import { cloneElement, isValidElement, useId, type ReactNode } from "react";

function withDescribedBy(children: ReactNode, tooltipId: string) {
  if (!isValidElement<{ "aria-describedby"?: string }>(children)) return children;

  const existing = children.props["aria-describedby"];
  const ariaDescribedBy = typeof existing === "string" && existing.trim() ? `${existing} ${tooltipId}` : tooltipId;

  return cloneElement(children, {
    "aria-describedby": ariaDescribedBy
  });
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const tooltipId = useId();

  return (
    <span className="group relative inline-flex">
      {withDescribedBy(children, tooltipId)}
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-accent px-2 py-1 text-xs text-accent-foreground group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}
