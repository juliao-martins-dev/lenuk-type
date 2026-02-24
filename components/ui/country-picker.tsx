"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { CountryFlag } from "@/components/ui/country-flag";
import type { CountryOption } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface CountryPickerProps {
  value: string;
  options: CountryOption[];
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
}

export function CountryPicker({
  value,
  options,
  onChange,
  placeholder = "Select country",
  className
}: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedValue = value.trim().toUpperCase();
  const selected = useMemo(
    () => options.find((option) => option.code === normalizedValue) ?? null,
    [normalizedValue, options]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;

    return options.filter((option) => {
      return option.name.toLowerCase().includes(q) || option.code.toLowerCase().includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    window.setTimeout(() => searchInputRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? (
            <>
              <CountryFlag code={selected.code} />
              <span className="truncate">
                {selected.name} ({selected.code})
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-[60] mt-2 w-full rounded-md border bg-popover p-2 shadow-lg">
          <div className="mb-2 flex items-center gap-2 rounded-md border bg-background px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country..."
              className="h-9 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="max-h-64 overflow-auto rounded-md border">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No countries found</div>
            ) : (
              filteredOptions.map((option) => {
                const active = option.code === normalizedValue;

                return (
                  <button
                    key={option.code}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      active && "bg-accent/60"
                    )}
                    onClick={() => handleSelect(option.code)}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CountryFlag code={option.code} />
                      <span className="truncate">{option.name}</span>
                      <span className="text-xs text-muted-foreground">{option.code}</span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
