import type { Container } from 'pixi.js'

/** Remove display instances while leaving shared textures owned by the asset cache. */
export function destroyDisplayChildren(container: Container): void {
  for (const child of container.removeChildren()) destroyDisplayTree(child)
}

export function destroyDisplayTree(container: Container): void {
  if (container.destroyed) return
  destroyDisplayChildren(container)
  // Do not forward Container's { children: true } option to descendants:
  // GifSprite.destroy interprets that truthy object as destroyData=true and
  // destroys the GifSource used by other units. Each instance owns only itself.
  container.destroy()
}
