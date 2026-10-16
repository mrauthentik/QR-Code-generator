import "server-only";
import { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import { getSlugCache, type ISlugCache } from "@/server/cache/slug-cache";
import { validateDestinationUrl } from "@/server/security/url-safety";
import { generateCollisionSafeSlug } from "@/server/security/slug-generator";
import { checkMutationRateLimit } from "@/server/security/rate-limit";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { DEFAULT_QR_STYLE } from "@/lib/constants";
import type {
  CreateQRCodeInput,
  UpdateQRCodeInput,
  QRCodeModel,
  QRStyleConfig,
} from "../types/qr-code.types";
import type { QRStatus, Json } from "@/server/db/types.generated";

function mapRowToModel(row: {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  destination_url: string;
  status: QRStatus;
  style: Json;
  created_at: string;
  updated_at: string;
}): QRCodeModel {
  return {
    id: row.id,
    ownerId: row.owner_id,
    slug: row.slug,
    name: row.name,
    destinationUrl: row.destination_url,
    status: row.status,
    style: (row.style as QRStyleConfig) || DEFAULT_QR_STYLE,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class QRCodeService {
  constructor(
    private readonly repo: QRCodesRepository,
    private readonly cache: ISlugCache = getSlugCache()
  ) {}

  /**
   * Creates a new dynamic QR code with validated destination URL and collision-safe slug.
   */
  async createQRCode(ownerId: string, input: CreateQRCodeInput): Promise<QRCodeModel> {
    // 1. Abuse prevention: rate-limit check (fail-closed)
    await checkMutationRateLimit(ownerId);

    // 2. Destination URL safety engine
    const safeUrl = await validateDestinationUrl(input.destinationUrl);

    // 3. Resolve slug (custom or auto-generated)
    let slug = (input.customSlug || "").trim();
    if (slug) {
      const exists = await this.repo.checkSlugExists(slug);
      if (exists) {
        throw new ConflictError(`Slug '${slug}' is already taken. Please choose another.`);
      }
    } else {
      slug = await generateCollisionSafeSlug((candidate) =>
        this.repo.checkSlugExists(candidate)
      );
    }

    // 4. Merge default styles with provided customizations
    const finalStyle = {
      ...DEFAULT_QR_STYLE,
      ...(input.style || {}),
    };

    // 5. Database insert via repository
    const created = await this.repo.create({
      owner_id: ownerId,
      slug,
      name: input.name.trim(),
      destination_url: safeUrl,
      status: "active",
      style: finalStyle as unknown as Json,
    });

    return mapRowToModel(created);
  }

  /**
   * Updates destination URL, name, status, or styles of an existing QR code.
   * Invalidates Redis cache immediately.
   */
  async updateQRCode(
    id: string,
    ownerId: string,
    input: UpdateQRCodeInput
  ): Promise<QRCodeModel> {
    await checkMutationRateLimit(ownerId);

    const existing = await this.repo.findById(id, ownerId);
    if (!existing) {
      throw new NotFoundError(`QR code not found.`);
    }

    let safeUrl = existing.destination_url;
    if (input.destinationUrl && input.destinationUrl !== existing.destination_url) {
      safeUrl = await validateDestinationUrl(input.destinationUrl);
    }

    const updated = await this.repo.update(id, ownerId, {
      name: input.name ? input.name.trim() : existing.name,
      destination_url: safeUrl,
      status: input.status || existing.status,
      style: (input.style || existing.style) as unknown as Json,
    });

    // Invalidate slug cache so subsequent scans immediately redirect to the new destination
    await this.cache.invalidate(existing.slug);

    return mapRowToModel(updated);
  }

  /**
   * Retrieves a QR code by ID verifying owner access.
   */
  async getQRCode(id: string, ownerId: string): Promise<QRCodeModel> {
    const row = await this.repo.findById(id, ownerId);
    if (!row) {
      throw new NotFoundError(`QR code not found.`);
    }
    return mapRowToModel(row);
  }

  /**
   * Lists QR codes owned by the user.
   */
  async listQRCodes(
    ownerId: string,
    options: { page?: number; limit?: number; status?: QRStatus; search?: string } = {}
  ) {
    const result = await this.repo.listByOwner(ownerId, options);
    return {
      ...result,
      data: result.data.map(mapRowToModel),
    };
  }

  /**
   * Toggles status between active, paused, or archived.
   */
  async setStatus(id: string, ownerId: string, status: QRStatus): Promise<QRCodeModel> {
    await checkMutationRateLimit(ownerId);

    const existing = await this.repo.findById(id, ownerId);
    if (!existing) {
      throw new NotFoundError("QR code not found.");
    }

    const updated = await this.repo.update(id, ownerId, { status });
    await this.cache.invalidate(existing.slug);

    return mapRowToModel(updated);
  }

  /**
   * Soft-deletes a QR code and removes it from cache.
   */
  async deleteQRCode(id: string, ownerId: string): Promise<void> {
    await checkMutationRateLimit(ownerId);

    const existing = await this.repo.findById(id, ownerId);
    if (!existing) {
      throw new NotFoundError("QR code not found.");
    }

    await this.repo.softDelete(id, ownerId);
    await this.cache.invalidate(existing.slug);
  }
}
