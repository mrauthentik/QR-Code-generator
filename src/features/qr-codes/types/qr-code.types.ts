import type { QRStatus } from "@/server/db/types.generated";

export interface QRStyleConfig {
  dotsOptions?: {
    color?: string;
    type?: "rounded" | "dots" | "classy" | "classy-rounded" | "square" | "extra-rounded";
  };
  cornersSquareOptions?: {
    color?: string;
    type?: "dot" | "square" | "extra-rounded";
  };
  cornersDotOptions?: {
    color?: string;
    type?: "dot" | "square";
  };
  backgroundOptions?: {
    color?: string;
  };
  imageOptions?: {
    hideBackgroundDots?: boolean;
    imageSize?: number;
    margin?: number;
  };
  logoUrl?: string | null;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

export interface QRCodeModel {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  destinationUrl: string;
  status: QRStatus;
  style: QRStyleConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQRCodeInput {
  name: string;
  destinationUrl: string;
  customSlug?: string;
  style?: QRStyleConfig;
}

export interface UpdateQRCodeInput {
  name?: string;
  destinationUrl?: string;
  status?: QRStatus;
  style?: QRStyleConfig;
}
