import { supabase } from "../lib/supabase";

const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class ProductImageValidationError extends Error {}

export function validateProductImage(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ProductImageValidationError(
      "Please choose a JPEG, PNG, or WebP image.",
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ProductImageValidationError(
      "The image is too large. Please choose a file no larger than 5 MB.",
    );
  }
}

function sanitizePathComponent(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return sanitized || "uncategorized";
}

export async function uploadProductImage(
  file: File,
  productCodeOrId: string | number,
): Promise<string> {
  validateProductImage(file);

  const folder = sanitizePathComponent(String(productCodeOrId));
  const extension = EXTENSION_BY_TYPE[file.type];
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const path = `products/${folder}/${uniqueName}`;

  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return data.path;
}

export function getProductImagePublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
