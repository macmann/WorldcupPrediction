const googleDriveFileIdPattern = /^[A-Za-z0-9_-]{10,}$/;

export function extractGoogleDriveFileId(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (googleDriveFileIdPattern.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "drive.google.com" && host !== "docs.google.com") return null;

    const queryId = parsed.searchParams.get("id");
    if (queryId && googleDriveFileIdPattern.test(queryId)) return queryId;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const fileIndex = parts.indexOf("d");
    const fileId = fileIndex >= 0 ? parts[fileIndex + 1] : null;
    return fileId && googleDriveFileIdPattern.test(fileId) ? fileId : null;
  } catch {
    return null;
  }
}

export function googleDrivePreviewUrl(url: string) {
  const fileId = extractGoogleDriveFileId(url);
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
}
