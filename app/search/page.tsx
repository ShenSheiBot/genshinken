import { permanentRedirect } from "next/navigation";

type SearchParamValue = string | string[] | undefined;
type SearchParams = Record<string, SearchParamValue>;

/** Preserve old index links while making /library the sole canonical surface. */
export default async function LegacySearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const rawParams = await searchParams;
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(rawParams)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value != null) params.append(key, value);
    }
  }

  const query = params.toString();
  permanentRedirect(query ? `/library?${query}` : "/library");
}
