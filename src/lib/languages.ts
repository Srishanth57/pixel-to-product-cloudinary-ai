/** Subtitle languages offered in the UI. The API only accepts values from this list. */
export const LANGS = ["Hindi", "Spanish", "French", "German", "Tamil", "Japanese"] as const;
export type Lang = (typeof LANGS)[number];
export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);
