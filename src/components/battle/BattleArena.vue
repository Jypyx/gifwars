<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { ArenaRenderer } from '@/game/arena/ArenaRenderer'
import type { SoundName } from '@/audio/sfx'
import type { BattleLogEntry, GifCard, Player, PlayerId } from '@/types'

const props = defineProps<{
  players: Record<PlayerId, Player>
  log: readonly BattleLogEntry[]
}>()

const emit = defineEmits<{ busy: [busy: boolean]; cue: [sound: SoundName] }>()

const host = useTemplateRef<HTMLDivElement>('host')

let renderer: ArenaRenderer | null = null
let unmounted = false
let resizeObserver: ResizeObserver | null = null
/** Animations are chained so log entries are replayed one after the other. */
let queue: Promise<unknown> = Promise.resolve()
let pending = 0
let played = props.log.length

function findGif(gifId: string): { gif: GifCard; side: PlayerId } | undefined {
  for (const side of ['player1', 'player2'] as const) {
    const gif = props.players[side].team.find((g) => g.id === gifId)
    if (gif) return { gif, side }
  }
  return undefined
}

/** `busy` is only reported for event animations, not for the initial GIF loading. */
function enqueue(job: () => Promise<unknown>, reportBusy = true) {
  if (reportBusy) {
    pending += 1
    if (pending === 1) emit('busy', true)
  }
  queue = queue
    .then(job)
    .catch((error) => console.error('[arena]', error))
    .finally(() => {
      if (!reportBusy) return
      pending -= 1
      // A remounted arena (new match) reports for itself.
      if (pending === 0 && !unmounted) emit('busy', false)
    })
}

onMounted(() => {
  const el = host.value!
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const styles = getComputedStyle(document.documentElement)
  const color = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback

  // Fighters shown at mount time; later changes arrive through switch / replacement events.
  const initial = (['player1', 'player2'] as const).map(
    (side) => [side, props.players[side].team[props.players[side].activeIndex]] as const,
  )

  enqueue(async () => {
    const created = await ArenaRenderer.create(el, {
      reducedMotion,
      findGif,
      onCue: (sound) => emit('cue', sound),
      playerColors: {
        player1: color('--player1', '#E53935'),
        player2: color('--player2', '#1E88E5'),
      },
    })
    if (unmounted) return created.destroy()
    renderer = created
    resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) renderer?.resize(entry.contentRect.width, entry.contentRect.height)
    })
    resizeObserver.observe(el)
    await Promise.all(initial.map(([side, gif]) => gif && created.setFighter(side, gif)))
    created.preload([...props.players.player1.team, ...props.players.player2.team])
  }, false)
})

watch(
  () => props.log.length,
  (length) => {
    for (; played < length; played++) {
      const entry = props.log[played]
      if (entry) enqueue(async () => renderer?.play(entry))
    }
  },
)

onBeforeUnmount(() => {
  unmounted = true
  resizeObserver?.disconnect()
  renderer?.destroy()
  renderer = null
})
</script>

<template>
  <div ref="host" class="arena" role="img" aria-label="Arène de combat" />
</template>

<style scoped>
.arena {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.arena :deep(canvas) {
  position: absolute;
  inset: 0;
  display: block;
}
</style>
