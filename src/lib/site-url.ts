export function siteUrl(path = "/"): URL {
  return new URL(path, process.env.APP_URL ?? "http://localhost:3000");
}
