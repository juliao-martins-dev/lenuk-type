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
    <select
      className={cn(
        "h-9 rounded-md border border-border/90 bg-card px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-card text-foreground">
          {option.label}
        </option>
      ))}
    </select>
  );
}
