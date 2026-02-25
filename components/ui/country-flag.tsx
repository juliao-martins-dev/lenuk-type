"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { countryFlag, countryFlagImageUrl, countryName } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface CountryFlagProps {
  code: string;
  className?: string;
  variant?: "auto" | "emoji";
}

const baseFlagClassName =
  "relative inline-flex h-[15px] w-5 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-border/60 bg-muted/20 align-middle leading-none";

function EmojiFlag({
  code,
  className
}: {
  code: string;
  className?: string;
}) {
  const emoji = countryFlag(code);
  const label = `${countryName(code)} flag`;

  return (
    <span role="img" aria-label={label} title={`${countryName(code)} (${code})`} className={cn(baseFlagClassName, "text-[11px]", className)}>
      <span aria-hidden>{emoji || code}</span>
    </span>
  );
}

export function CountryFlag({ code, className, variant = "auto" }: CountryFlagProps) {
  const normalized = code.trim().toUpperCase();
  const src = countryFlagImageUrl(normalized);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [src]);

  if (!src) return null;

  if (variant === "emoji" || imageFailed) {
    return <EmojiFlag code={normalized} className={className} />;
  }

  return (
    <span
      role="img"
      aria-label={`${countryName(normalized)} flag`}
      title={`${countryName(normalized)} (${normalized})`}
      className={cn(baseFlagClassName, className)}
    >
      <span aria-hidden className="text-[11px]">
        {countryFlag(normalized) || normalized}
      </span>
      {!imageFailed && (
        <Image
          src={src}
          alt=""
          aria-hidden
          width={20}
          height={15}
          sizes="20px"
          unoptimized
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </span>
  );
}
