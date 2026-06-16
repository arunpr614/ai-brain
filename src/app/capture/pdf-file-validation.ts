const PDF_MIME_TYPE = "application/pdf";

export function getPdfFileValidationError(file: {
  name?: string;
  type?: string;
}): string | null {
  if (file.type === PDF_MIME_TYPE) return null;
  if (!file.type && file.name?.toLowerCase().endsWith(".pdf")) return null;
  return "Only PDF files are supported.";
}
