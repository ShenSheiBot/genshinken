export interface ContributorLink {
  label: string;
  href: string;
}

export interface Contributor {
  /** Stable, URL-safe identity. Never derive links from a display name. */
  id: string;
  displayName: string;
  /** Historical spellings, romanizations and bylines accepted in old front matter. */
  aliases: readonly string[];
  /** Team membership is opt-in; publishing a contribution does not imply membership. */
  teamMember: boolean;
  entityType?: "person" | "organization";
  teamTitle?: string;
  teamOrder?: number;
  bio?: string;
  links?: readonly ContributorLink[];
}

/**
 * Public contributor identities used by published content.
 *
 * Keep `id` stable when a display name changes. Every authoring, translation,
 * editing or proofreading byline must resolve to one of these records before a
 * post can be built. Team data deliberately defaults to false until a person
 * has explicitly agreed to be listed on the About page.
 */
export const CONTRIBUTORS = [
  {
    id: "roof-genshiken",
    displayName: "屋顶现视研",
    aliases: [],
    teamMember: false,
    entityType: "organization",
  },
  {
    id: "azuma-hiroki",
    displayName: "东浩纪",
    aliases: ["東浩紀", "Hiroki Azuma"],
    teamMember: false,
  },
  {
    id: "red-tea-seaweed",
    displayName: "红茶泡海苔",
    aliases: [],
    teamMember: false,
  },
  {
    id: "uno-tsunehiro",
    displayName: "宇野常宽",
    aliases: ["宇野常寛", "Tsunehiro Uno"],
    teamMember: false,
  },
  {
    id: "hood",
    displayName: "hood",
    aliases: [],
    teamMember: false,
  },
  {
    id: "harusaki-misora",
    displayName: "春埼美空",
    aliases: [],
    teamMember: false,
  },
  {
    id: "you-fisherman",
    displayName: "侑",
    aliases: ["fisherman"],
    teamMember: false,
  },
] as const satisfies readonly Contributor[];

export type ContributorId = (typeof CONTRIBUTORS)[number]["id"];

const ASCII_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const contributorById = new Map<ContributorId, (typeof CONTRIBUTORS)[number]>();
const contributorByName = new Map<string, (typeof CONTRIBUTORS)[number]>();

function normalizeName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("zh-CN");
}

for (const contributor of CONTRIBUTORS) {
  if (!ASCII_ID_RE.test(contributor.id)) {
    throw new Error(`Contributor id must be lowercase ASCII kebab-case: ${contributor.id}`);
  }
  if (contributorById.has(contributor.id)) {
    throw new Error(`Duplicate contributor id: ${contributor.id}`);
  }
  contributorById.set(contributor.id, contributor);

  for (const name of [contributor.displayName, ...contributor.aliases]) {
    const normalized = normalizeName(name);
    const existing = contributorByName.get(normalized);
    if (existing && existing.id !== contributor.id) {
      throw new Error(`Contributor name or alias is ambiguous: ${name}`);
    }
    contributorByName.set(normalized, contributor);
  }
}

export function isContributorId(value: string): value is ContributorId {
  return contributorById.has(value as ContributorId);
}

export function getContributor(id: ContributorId): (typeof CONTRIBUTORS)[number] {
  const contributor = contributorById.get(id);
  if (!contributor) throw new Error(`Unknown contributor id: ${id}`);
  return contributor;
}

export function findContributor(id: string): (typeof CONTRIBUTORS)[number] | null {
  return contributorById.get(id as ContributorId) ?? null;
}

export function findContributorByName(name: string): (typeof CONTRIBUTORS)[number] | null {
  return contributorByName.get(normalizeName(name)) ?? null;
}

export function contributorEntityType(id: string): "person" | "organization" {
  const contributor = contributorById.get(id as ContributorId) as Contributor | undefined;
  return contributor?.entityType ?? "person";
}

export function getTeamMembers(): Contributor[] {
  return (CONTRIBUTORS as readonly Contributor[]).filter((contributor) => contributor.teamMember).sort(
    (a, b) => (a.teamOrder ?? Number.MAX_SAFE_INTEGER) - (b.teamOrder ?? Number.MAX_SAFE_INTEGER)
  );
}
