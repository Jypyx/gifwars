<script setup lang="ts">
import { computed } from 'vue'
import { CATALOG } from '../game/catalog'
import type { Unit, UnitKind } from '../game/types'
import { assetUrl } from '../services/urls'

const props = defineProps<{ kind: UnitKind; unit?: Unit | null; x: number; y: number }>()
const details = computed(() => CATALOG[props.kind])
const position = computed(() => ({
  left: `${Math.max(8, Math.min(props.x + 16, window.innerWidth - 264))}px`,
  top: `${Math.max(8, props.y + 208 > window.innerHeight ? props.y - 202 : props.y + 16)}px`,
  '--unit-color': details.value.color
}))
</script>

<template>
  <Teleport to="body">
    <div class="gif-popover" :style="position" role="tooltip">
      <div class="gif-popover-portrait"><img :src="assetUrl(`gifs/${kind}.gif`)" alt="" /></div>
      <div class="gif-popover-info">
        <span class="gif-popover-type">{{ unit?.master ? 'MASTER GIF' : 'GIF DE COMBAT' }} · {{ details.title }}</span>
        <strong>{{ details.name }}</strong>
      </div>
      <div class="gif-popover-stats">
        <span><b>PV</b> {{ unit ? `${Math.max(0, unit.hp)}/${unit.maxHp}` : details.hp }}</span>
        <span><b>ATK</b> {{ unit?.attack ?? details.attack }}</span>
        <span><b>PORTÉE</b> {{ unit?.range ?? details.range }}</span>
      </div>
    </div>
  </Teleport>
</template>
