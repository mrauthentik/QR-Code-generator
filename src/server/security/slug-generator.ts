import { RESERVED_SLUGS, SLUG_REGEX, DEFAULT_SLUG_LENGTH } from "@/lib/constants";
import { ConflictError } from "@/lib/errors";

// Unambiguous base60 alphabet (omits 0/O and 1/l/I to prevent visual confusion when manually typed)
const UNAMBIGUOUS_ALPHABET =
  "23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates a pseudo-random alphanumeric string from an unambiguous character set.
 */
export function generateCandidateSlug(length: number = DEFAULT_SLUG_LENGTH): string {
  let result = "";
  const alphabetLength = UNAMBIGUOUS_ALPHABET.length;
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * alphabetLength);
    result += UNAMBIGUOUS_ALPHABET[randomIndex];
  }
  return result;
}

/**
 * Checks if a candidate slug is valid and not in the reserved system slugs set
 */
export function isSlugAvailableForGeneration(slug: string): boolean {
  if (!SLUG_REGEX.test(slug)) {
    return false;
  }
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return false;
  }
  return true;
}

/**
 * Generates a collision-safe, reserved-safe slug with automatic retries against database conflicts.
 */
export async function generateCollisionSafeSlug(
  checkExistsFn: (slug: string) => Promise<boolean>,
  options: { length?: number; maxRetries?: number } = {}
): Promise<string> {
  const { length = DEFAULT_SLUG_LENGTH, maxRetries = 5 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const candidate = generateCandidateSlug(length);

    if (!isSlugAvailableForGeneration(candidate)) {
      continue;
    }

    const exists = await checkExistsFn(candidate);
    if (!exists) {
      return candidate;
    }
  }

  throw new ConflictError(
    `Failed to generate a unique QR code slug after ${maxRetries} collision retries.`
  );
}
