import { z } from "zod";
import { SLUG_REGEX, MAX_URL_LENGTH, RESERVED_SLUGS } from "@/lib/constants";

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/;

export const qrStyleSchema = z.object({
  dotsOptions: z
    .object({
      color: z.string().regex(hexColorRegex, "Invalid hex color format").optional(),
      type: z
        .enum(["rounded", "dots", "classy", "classy-rounded", "square", "extra-rounded"])
        .optional(),
    })
    .optional(),
  cornersSquareOptions: z
    .object({
      color: z.string().regex(hexColorRegex, "Invalid hex color format").optional(),
      type: z.enum(["dot", "square", "extra-rounded"]).optional(),
    })
    .optional(),
  cornersDotOptions: z
    .object({
      color: z.string().regex(hexColorRegex, "Invalid hex color format").optional(),
      type: z.enum(["dot", "square"]).optional(),
    })
    .optional(),
  backgroundOptions: z
    .object({
      color: z.string().regex(hexColorRegex, "Invalid hex color format").optional(),
    })
    .optional(),
  imageOptions: z
    .object({
      hideBackgroundDots: z.boolean().optional(),
      imageSize: z.number().min(0.1).max(0.5).optional(),
      margin: z.number().min(0).max(20).optional(),
    })
    .optional(),
  logoUrl: z.string().url("Logo must be a valid URL").nullable().optional(),
  errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]).optional(),
});

export const createQRCodeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  destinationUrl: z
    .string()
    .trim()
    .min(1, "Destination URL is required")
    .max(MAX_URL_LENGTH, `URL cannot exceed ${MAX_URL_LENGTH} characters`)
    .url("Invalid URL format"),
  customSlug: z
    .string()
    .trim()
    .regex(SLUG_REGEX, "Slug must be 3-16 characters and contain only letters, numbers, hyphens, and underscores")
    .refine((slug) => !RESERVED_SLUGS.has(slug.toLowerCase()), {
      message: "This slug is reserved by the system. Please choose another.",
    })
    .optional()
    .or(z.literal("")),
  style: qrStyleSchema.optional(),
});

export const updateQRCodeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  destinationUrl: z
    .string()
    .trim()
    .min(1, "Destination URL is required")
    .max(MAX_URL_LENGTH, `URL cannot exceed ${MAX_URL_LENGTH} characters`)
    .url("Invalid URL format")
    .optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  style: qrStyleSchema.optional(),
});
