/** Locale lookup shared by the full runtime and the catalog-free compiled runtime. */
export function selectLocalizedLabel(
  label: string,
  labels: Readonly<Record<string, string>> | undefined,
  locale?: string,
): string {
  if (!locale) return label;
  const entries = Object.entries(labels ?? {});
  const normalizedLocale = locale.toLowerCase();
  const language = normalizedLocale.split("-")[0];
  return entries.find(([key]) => key.toLowerCase() === normalizedLocale)?.[1]
    ?? entries.find(([key]) => key.toLowerCase() === language)?.[1]
    ?? label;
}
