import { describe, expect, it } from 'vitest'
import { Container, Texture, TextureSource, Ticker, type CanvasSource } from 'pixi.js'
import { GifSource, GifSprite } from 'pixi.js/gif'
import { destroyDisplayChildren, destroyDisplayTree } from '../src/rendering/dispose'

function sharedGif(): GifSource {
  // Real Pixi textures without a DOM/GPU resource: these checks exercise the
  // animation and destruction lifecycle, not the GIF decoder or GPU upload.
  return new GifSource([0, 1].map(index => ({
    texture: new Texture({ source: new TextureSource({ width: 2, height: 2 }) }) as Texture<CanvasSource>,
    start: index * 140,
    end: (index + 1) * 140
  })))
}

function spawn(source: GifSource): { unit: Container; animation: GifSprite } {
  const unit = new Container()
  const animation = new GifSprite({ source, autoUpdate: false })
  unit.addChild(animation)
  return { unit, animation }
}

describe('Pixi shared GIF lifecycle', () => {
  it('keeps surviving units animated and allows redeployment after a unit dies', () => {
    const source = sharedGif()
    const stage = new Container()
    const dead = spawn(source)
    const survivor = spawn(source)
    stage.addChild(dead.unit, survivor.unit)

    destroyDisplayTree(dead.unit)

    expect(dead.unit.destroyed).toBe(true)
    expect(dead.animation.destroyed).toBe(true)
    expect(dead.animation.playing).toBe(false)
    expect(stage.children).toEqual([survivor.unit])
    expect(source.frames).toHaveLength(2)
    expect(source.textures.every(texture => !texture.destroyed)).toBe(true)
    expect(() => {
      survivor.animation.currentFrame = 1
      survivor.animation.update(new Ticker())
    }).not.toThrow()
    const redeployed = spawn(source)
    expect(redeployed.animation.source).toBe(source)

    destroyDisplayTree(stage)
    destroyDisplayTree(redeployed.unit)
    source.destroy()
  })

  it('cleans nested units on replay/reset before releasing their shared source once', () => {
    const source = sharedGif()
    const textures = [...source.textures]
    const stage = new Container()
    const unitLayer = new Container()
    const first = spawn(source)
    const second = spawn(source)
    unitLayer.addChild(first.unit, second.unit)
    stage.addChild(unitLayer)

    expect(() => destroyDisplayChildren(stage)).not.toThrow()
    expect(stage.destroyed).toBe(false)
    expect(stage.children).toHaveLength(0)
    expect(first.animation.destroyed).toBe(true)
    expect(second.animation.destroyed).toBe(true)
    expect(source.frames).toHaveLength(2)
    expect(() => source.destroy()).not.toThrow()
    expect(textures.every(texture => texture.destroyed)).toBe(true)
    stage.destroy()
  })

  it('preserves the source across repeated repaints, deaths and scores', () => {
    const source = sharedGif()
    const persistent = spawn(source)
    for (let round = 0; round < 12; round++) {
      const { unit, animation } = spawn(source)
      destroyDisplayChildren(unit)
      expect(animation.destroyed).toBe(true)
      const replacement = new GifSprite({ source, autoUpdate: false })
      unit.addChild(replacement)
      destroyDisplayTree(unit)
      expect(source.frames).toHaveLength(2)
      expect(() => { persistent.animation.currentFrame = round % 2 }).not.toThrow()
    }
    destroyDisplayTree(persistent.unit)
    source.destroy()
  })
})
