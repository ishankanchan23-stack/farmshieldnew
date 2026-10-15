export function validateImageFile(file: File): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Choose a JPEG, PNG, or WEBP image.";
  if (file.size > 8 * 1024 * 1024) return "Image must be 8 MB or smaller.";
  return null;
}
