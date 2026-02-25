export interface CountryOption {
  code: string;
  name: string;
}

type IntlWithSupportedValuesOf = typeof Intl & {
  supportedValuesOf?: (key: string) => string[];
};

const EXCLUDED_REGION_CODES = new Set(["EU", "UN"]);

function normalizeCountryCode(code: string) {
  return code.trim().toUpperCase();
}

function isCountryCode(code: string) {
  return /^[A-Z]{2}$/.test(code) && !EXCLUDED_REGION_CODES.has(code);
}

function getRegionDisplayNames() {
  if (typeof Intl.DisplayNames !== "function") return null;

  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
}

const regionDisplayNames = getRegionDisplayNames();

function getFallbackAlpha2Codes() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const codes: string[] = [];

  for (const first of letters) {
    for (const second of letters) {
      codes.push(`${first}${second}`);
    }
  }

  return codes;
}

function getRegionCodes() {
  const intl = Intl as IntlWithSupportedValuesOf;

  if (typeof intl.supportedValuesOf !== "function") {
    return getFallbackAlpha2Codes();
  }

  try {
    return intl.supportedValuesOf("region");
  } catch {
    return getFallbackAlpha2Codes();
  }
}

export function countryFlag(code: string) {
  const normalized = normalizeCountryCode(code);
  if (!isCountryCode(normalized)) return "";

  const regionalIndicatorA = 0x1f1e6;
  const asciiA = 65;

  return String.fromCodePoint(
    ...normalized.split("").map((char) => regionalIndicatorA + char.charCodeAt(0) - asciiA)
  );
}

export function countryFlagImageUrl(code: string) {
  const normalized = normalizeCountryCode(code);
  if (!isCountryCode(normalized)) return "";

  // PNGs from FlagCDN render reliably on Windows where Unicode flag emojis often do not.
  return `https://flagcdn.com/24x18/${normalized.toLowerCase()}.png`;
}

export function countryName(code: string) {
  const normalized = normalizeCountryCode(code);
  if (!isCountryCode(normalized)) return normalized;

  return regionDisplayNames?.of(normalized) ?? normalized;
}

function buildCountryOptions(): CountryOption[] {
  const regionCodes = getRegionCodes();

  const uniqueCodes = Array.from(
    new Set(regionCodes.map(normalizeCountryCode).filter(isCountryCode))
  );

  return uniqueCodes
    .map((code) => {
      const name = countryName(code);

      return {
        code,
        name
      };
    })
    .filter((option) => option.name && option.name !== option.code)
    .sort((a, b) => a.name.localeCompare(b.name));
}

let countryOptionsCache: CountryOption[] | null = null;
let countryCodeSetCache: Set<string> | null = null;

export function getCountryOptions() {
  if (!countryOptionsCache) {
    countryOptionsCache = buildCountryOptions();
  }

  return countryOptionsCache;
}

export function isSupportedCountryCode(code: string) {
  const normalized = normalizeCountryCode(code);
  if (!isCountryCode(normalized)) return false;

  if (!countryCodeSetCache) {
    countryCodeSetCache = new Set(getCountryOptions().map((option) => option.code));
  }

  return countryCodeSetCache.has(normalized);
}

export function countryLabel(code: string) {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return "";

  const name = countryName(normalized);
  const flag = countryFlag(normalized);
  return flag ? `${flag} ${name}` : name;
}
