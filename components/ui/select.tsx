import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";


type SelectOption = {
  readonly label: string;
  readonly value: string;
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly SelectOption[];
}

export function Select({ className, options, ...props }: SelectProps) {
  return (
    <div className={cn("group relative overflow-hidden rounded-xl", props.disabled && "opacity-70", className)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-xl border border-border/80 bg-[linear-gradient(to_bottom,hsl(var(--background)/0.95),hsl(var(--background)/0.75))] shadow-[0_1px_1px_hsl(var(--foreground)/0.03),0_8px_18px_hsl(var(--foreground)/0.04)] ring-1 ring-white/20 transition-[border-color,box-shadow]",
          !props.disabled && "group-hover:border-primary/35 group-focus-within:border-primary/40 group-focus-within:shadow-[0_0_0_1px_hsl(var(--primary)/0.18),0_10px_20px_hsl(var(--primary)/0.10)]",
          "dark:ring-white/5"
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-px rounded-[11px] bg-[radial-gradient(circle_at_18%_18%,hsl(var(--primary)/0.12),transparent_46%),linear-gradient(to_bottom,hsl(var(--background)/0.55),transparent)] opacity-60 transition-opacity",
          !props.disabled && "group-hover:opacity-90 group-focus-within:opacity-100"
        )}
      />

      <select
        className={cn(
          "relative h-9 w-full appearance-none rounded-xl border border-transparent bg-transparent px-3 pr-11 text-sm font-semibold text-foreground outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-card text-foreground">
            {option.label}
          </option>
        ))}
      </select>

      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-1 right-1.5 flex w-7 items-center justify-center rounded-lg border border-border/60 bg-background/70 text-muted-foreground shadow-sm ring-1 ring-white/10 transition-colors dark:ring-white/5",
          !props.disabled && "group-hover:border-primary/25 group-focus-within:border-primary/30 group-focus-within:text-primary"
        )}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}
