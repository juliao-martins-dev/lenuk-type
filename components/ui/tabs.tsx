import { cn } from "@/lib/utils";

interface TabsOption {
  readonly label: string;
  readonly value: string;
}

interface TabsProps {
  value: string;
  onValueChange: (next: string) => void;
  options: readonly TabsOption[];
  ariaLabel?: string;
  className?: string;
}

function focusTabButton(button: HTMLButtonElement | undefined) {
  button?.focus();
}

export function Tabs({ value, onValueChange, options, ariaLabel = "Tabs", className }: TabsProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("inline-flex rounded-md border bg-muted p-1", className)}>
      {options.map((option, optionIndex) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onValueChange(option.value)}
          onKeyDown={(event) => {
            if (options.length <= 1) return;

            let nextIndex = -1;
            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
              nextIndex = (optionIndex + 1) % options.length;
            } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
              nextIndex = (optionIndex - 1 + options.length) % options.length;
            } else if (event.key === "Home") {
              nextIndex = 0;
            } else if (event.key === "End") {
              nextIndex = options.length - 1;
            }

            if (nextIndex < 0) return;
            event.preventDefault();
            onValueChange(options[nextIndex].value);

            const tabButtons = Array.from(
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
            );
            focusTabButton(tabButtons[nextIndex]);
          }}
          role="tab"
          aria-selected={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          className={cn(
            "rounded px-3 py-1.5 text-xs font-semibold",
            value === option.value ? "bg-background text-foreground" : "text-muted-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
