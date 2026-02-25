import { cn } from "@/lib/utils";


interface TabsProps {
  value: string;
  onValueChange: (next: string) => void;
  options: Array<{ label: string; value: string }>;
}

export function Tabs({ value, onValueChange, options }: TabsProps) {
  return (
    <div className="inline-flex rounded-md border bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onValueChange(option.value)}
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