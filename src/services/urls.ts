/** Public assets must follow Vite's base, including project sites on GitHub Pages. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}
