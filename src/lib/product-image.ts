export function imageThumbnailPath(path: string): string {
  return path.replace(/\.webp$/, "-t.webp");
}

export function publicImageThumbnail(url: string, storageKey: string | null): { thumbnailUrl?: string } {
  return storageKey?.endsWith(".webp") && url.endsWith(".webp")
    ? { thumbnailUrl: imageThumbnailPath(url) }
    : {};
}
