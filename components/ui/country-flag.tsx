import { countryFlagImageUrl, countryName } from "@/lib/countries";

interface CountryFlagProps {
  code: string;
  className?: string;
}

export function CountryFlag({ code, className }: CountryFlagProps) {
  const normalized = code.trim().toUpperCase();
  const src = countryFlagImageUrl(normalized);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={`${countryName(normalized)} flag`}
      width={20}
      height={15}
      loading="lazy"
      className={className ?? "h-[15px] w-5 rounded-[2px] border border-border/60 object-cover"}
    />
  );
}
