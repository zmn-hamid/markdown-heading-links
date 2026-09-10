import type { CachedMetadata, HeadingCache, Loc, Pos } from "obsidian";

export interface HeadingTarget {
  slug: string;
  heading: string;
  level: number;
  line: number;
  endLine: number;
  position: Pos;
}

/**
 * Create the fragment used by GitHub Flavored Markdown for a heading.
 *
 * Obsidian's native heading fragments preserve the original heading text.
 * Markdown links produced by GitHub and most Markdown renderers instead use
 * lowercase, punctuation-free, hyphenated fragments.
 */
export function gfmSlugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-_]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function allocateUniqueSlug(baseSlug: string, usedSlugs: Set<string>): string {
  let slug = baseSlug;
  let suffix = 0;

  while (usedSlugs.has(slug)) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
}

function getEndOfFilePosition(cache: CachedMetadata, lastHeading: HeadingCache): Loc {
  const sections = cache.sections;
  if (sections && sections.length > 0) {
    return sections[sections.length - 1].position.end;
  }

  return lastHeading.position.end;
}

/** Build a slug-to-heading index from Obsidian's metadata cache. */
export function buildHeadingIndex(cache: CachedMetadata | null): Map<string, HeadingTarget> {
  const headings = cache?.headings ?? [];
  const index = new Map<string, HeadingTarget>();

  if (headings.length === 0 || !cache) {
    return index;
  }

  const eofPosition = getEndOfFilePosition(cache, headings[headings.length - 1]);
  const endPositions = new Array<Loc>(headings.length);

  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    let endPosition = eofPosition;

    for (let j = i + 1; j < headings.length; j += 1) {
      if (headings[j].level <= heading.level) {
        endPosition = headings[j].position.start;
        break;
      }
    }

    endPositions[i] = endPosition;
  }

  const usedSlugs = new Set<string>();
  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    const slug = allocateUniqueSlug(gfmSlugify(heading.heading), usedSlugs);
    usedSlugs.add(slug);

    const position: Pos = {
      start: heading.position.start,
      end: endPositions[i]
    };

    index.set(slug, {
      slug,
      heading: heading.heading,
      level: heading.level,
      line: heading.position.start.line,
      endLine: Math.max(heading.position.start.line, endPositions[i].line),
      position
    });
  }

  return index;
}

export function getHeadingTargets(cache: CachedMetadata | null): HeadingTarget[] {
  return Array.from(buildHeadingIndex(cache).values());
}

export function isGfmSlugCandidate(slug: string): boolean {
  return (
    slug.length > 0 &&
    !/[A-Z]/.test(slug) &&
    !/%[0-9A-Fa-f]{2}/.test(slug) &&
    !slug.startsWith("^") &&
    !slug.startsWith("[^") &&
    !/\s/.test(slug)
  );
}

export function decodeFragment(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}
