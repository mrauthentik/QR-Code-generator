import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, QRStatus } from "@/server/db/types.generated";
import { DatabaseError, NotFoundError } from "@/lib/errors";

export type QRCodeRow = Database["public"]["Tables"]["qr_codes"]["Row"];
export type InsertQRCode = Database["public"]["Tables"]["qr_codes"]["Insert"];
export type UpdateQRCode = Database["public"]["Tables"]["qr_codes"]["Update"];

export interface ListQRCodesOptions {
  page?: number;
  limit?: number;
  status?: QRStatus;
  search?: string;
}

export interface ListQRCodesResult {
  data: QRCodeRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

import type { SupabaseServerClient } from "@/server/db/client";

export class QRCodesRepository {
  constructor(private readonly db: SupabaseServerClient) {}

  /**
   * Resolves active QR code destination by slug.
   * Leverages the SECURITY DEFINER RPC function for fast, safe resolution.
   */
  async findActiveBySlug(slug: string): Promise<{ id: string; destination_url: string; status: string } | null> {
    const { data, error } = await this.db.rpc("resolve_redirect_destination", {
      p_slug: slug,
    });

    if (error) {
      throw new DatabaseError(`Failed to resolve redirect destination for slug '${slug}': ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      id: row.qr_id,
      destination_url: row.destination_url,
      status: row.status,
    };
  }

  /**
   * Checks whether a slug already exists for an active (non-deleted) QR code.
   */
  async checkSlugExists(slug: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("qr_codes")
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Error checking slug existence: ${error.message}`);
    }

    return !!data;
  }

  /**
   * Finds a QR code by ID, optionally verifying ownership.
   */
  async findById(id: string, ownerId?: string): Promise<QRCodeRow | null> {
    let query = this.db
      .from("qr_codes")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null);

    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to retrieve QR code ${id}: ${error.message}`);
    }

    return data;
  }

  /**
   * Lists QR codes owned by a user with search, status filtering, and pagination.
   */
  async listByOwner(
    ownerId: string,
    options: ListQRCodesOptions = {}
  ): Promise<ListQRCodesResult> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const offset = (page - 1) * limit;

    let query = this.db
      .from("qr_codes")
      .select("*", { count: "exact" })
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (options.status) {
      query = query.eq("status", options.status);
    }

    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      query = query.or(`name.ilike.${term},slug.ilike.${term},destination_url.ilike.${term}`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new DatabaseError(`Failed to list QR codes: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data || [],
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Creates a new dynamic QR code record.
   */
  async create(payload: InsertQRCode): Promise<QRCodeRow> {
    const { data, error } = await this.db
      .from("qr_codes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new DatabaseError(`Failed to create QR code: ${error.message}`, error);
    }

    return data;
  }

  /**
   * Updates an existing QR code owned by the user.
   */
  async update(id: string, ownerId: string, payload: UpdateQRCode): Promise<QRCodeRow> {
    const { data, error } = await this.db
      .from("qr_codes")
      .update(payload)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      throw new DatabaseError(`Failed to update QR code ${id}: ${error.message}`, error);
    }

    if (!data) {
      throw new NotFoundError(`QR code ${id} not found or not owned by user.`);
    }

    return data;
  }

  /**
   * Soft-deletes a QR code by setting deleted_at.
   */
  async softDelete(id: string, ownerId: string): Promise<void> {
    const { error, count } = await this.db
      .from("qr_codes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", ownerId)
      .is("deleted_at", null);

    if (error) {
      throw new DatabaseError(`Failed to soft-delete QR code ${id}: ${error.message}`, error);
    }

    if (count === 0) {
      throw new NotFoundError(`QR code ${id} not found or already deleted.`);
    }
  }
}
