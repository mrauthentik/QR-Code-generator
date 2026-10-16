"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/db/client";
import { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import { QRCodeService } from "../services/qr-code.service";
import { AuthService } from "@/features/auth/services/auth.service";
import { createQRCodeSchema, updateQRCodeSchema } from "../schemas/qr-code.schema";
import { Result } from "@/lib/result";
import { toAppError, AppError } from "@/lib/errors";
import type { QRCodeModel } from "../types/qr-code.types";
import type { QRStatus } from "@/server/db/types.generated";

export type ActionError = {
  code: string;
  message: string;
  details?: unknown;
};

async function getService(): Promise<{ service: QRCodeService; userId: string }> {
  const user = await AuthService.requireUser();
  const db = await createClient();
  const repo = new QRCodesRepository(db);
  const service = new QRCodeService(repo);
  return { service, userId: user.id };
}

/**
 * Server Action: Create a new dynamic QR code
 */
export async function createQRCodeAction(
  rawInput: unknown
): Promise<Result<QRCodeModel, ActionError>> {
  try {
    const parseResult = createQRCodeSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return Result.err({
        code: "VALIDATION_ERROR",
        message: "Invalid QR code details provided.",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { service, userId } = await getService();
    const created = await service.createQRCode(userId, {
      ...parseResult.data,
      customSlug: parseResult.data.customSlug || undefined,
    });

    revalidatePath("/qr-codes");
    return Result.ok(created);
  } catch (err: unknown) {
    const appErr = toAppError(err);
    return Result.err({
      code: appErr.code,
      message: appErr.message,
      details: appErr.details,
    });
  }
}

/**
 * Server Action: Update an existing QR code
 */
export async function updateQRCodeAction(
  id: string,
  rawInput: unknown
): Promise<Result<QRCodeModel, ActionError>> {
  try {
    const parseResult = updateQRCodeSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return Result.err({
        code: "VALIDATION_ERROR",
        message: "Invalid update payload.",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { service, userId } = await getService();
    const updated = await service.updateQRCode(id, userId, parseResult.data);

    revalidatePath("/qr-codes");
    revalidatePath(`/qr-codes/${id}`);
    return Result.ok(updated);
  } catch (err: unknown) {
    const appErr = toAppError(err);
    return Result.err({
      code: appErr.code,
      message: appErr.message,
      details: appErr.details,
    });
  }
}

/**
 * Server Action: Set status (active, paused, archived)
 */
export async function setQRCodeStatusAction(
  id: string,
  status: QRStatus
): Promise<Result<QRCodeModel, ActionError>> {
  try {
    const { service, userId } = await getService();
    const updated = await service.setStatus(id, userId, status);

    revalidatePath("/qr-codes");
    revalidatePath(`/qr-codes/${id}`);
    return Result.ok(updated);
  } catch (err: unknown) {
    const appErr = toAppError(err);
    return Result.err({
      code: appErr.code,
      message: appErr.message,
      details: appErr.details,
    });
  }
}

/**
 * Server Action: Soft-delete a QR code
 */
export async function deleteQRCodeAction(
  id: string
): Promise<Result<{ success: true }, ActionError>> {
  try {
    const { service, userId } = await getService();
    await service.deleteQRCode(id, userId);

    revalidatePath("/qr-codes");
    return Result.ok({ success: true });
  } catch (err: unknown) {
    const appErr = toAppError(err);
    return Result.err({
      code: appErr.code,
      message: appErr.message,
      details: appErr.details,
    });
  }
}
