export const HOME_VARIANT_COUNT = 16;

export const HOME_VARIANT_IDS = Array.from(
  { length: HOME_VARIANT_COUNT },
  (_, index) => String(index)
);

export function isHomeVariantId(value: string): boolean {
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 && index < HOME_VARIANT_COUNT;
}

/** Small deterministic PRNG used only while pre-rendering the homepage variants. */
export function createHomeVariantRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickHomeVariant(random: () => number = Math.random): string {
  const value = random();
  const bounded = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), 1 - Number.EPSILON)
    : 0;
  return HOME_VARIANT_IDS[Math.floor(bounded * HOME_VARIANT_COUNT)];
}

export function homeVariantPath(variant: string): string {
  if (!isHomeVariantId(variant)) throw new Error(`Unknown home variant: ${variant}`);
  return `/home-variants/${variant}`;
}
