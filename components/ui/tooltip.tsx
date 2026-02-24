export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-accent px-2 py-1 text-xs text-accent-foreground group-hover:block">
        {text}
      </span>
    </span>
  );
}
