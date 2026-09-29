<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { CATALOG } from '../game/catalog'
import { isMuted, setMuted, playCue } from '../services/audio'
import { notificationsSupported, requestNotifications, subscribeToPush } from '../services/notifications'
import { ref } from 'vue'

const store = useGameStore()
const muted = ref(isMuted())
const noticeStatus = ref('')
const master = computed(() => store.game.players.player.master)

function toggleSound(): void { muted.value = !muted.value; setMuted(muted.value); if (!muted.value) playCue('select') }
async function enableNotifications(): Promise<void> {
  const allowed = await requestNotifications()
  if (!allowed) { noticeStatus.value = 'NOTIFS DÉSACTIVÉES'; return }
  try {
    const push = await subscribeToPush()
    noticeStatus.value = push === 'subscribed' ? 'PUSH ACTIF' : 'RAPPELS ACTIFS'
  } catch { noticeStatus.value = 'RAPPELS ACTIFS' }
}
</script>

<template>
  <div class="hud-top flex items-center justify-between">
    <div class="brand-lockup">
      <div class="brand-mark">GW<span>✦</span></div>
      <div class="brand-sub">PIXEL<br>ARENA</div>
    </div>
    <div class="round-pill"><span class="round-dot" />MANCHE {{ String(store.game.round).padStart(2, '0') }}</div>
    <div class="hud-actions">
      <button class="hud-icon" :aria-label="muted ? 'Activer le son' : 'Couper le son'" @click="toggleSound">{{ muted ? '♪̸' : '♪' }}</button>
      <button v-if="notificationsSupported()" class="hud-icon" title="Activer les notifications" aria-label="Activer les notifications" @click="enableNotifications">♢</button>
    </div>
  </div>

  <div class="duel-bar enemy-bar flex items-center">
    <div class="avatar-chip enemy-avatar">☠</div>
    <div class="duel-info">
      <div class="duel-label"><span>THE BOT</span><span class="life-word">VIES</span></div>
      <div class="life-row"><span v-for="n in 3" :key="n" class="life-block" :class="{ empty: n > store.game.players.ai.hp }" /></div>
    </div>
    <div class="duel-hp enemy-hp">{{ store.game.players.ai.hp }}<small>/3</small></div>
  </div>

  <div class="duel-bar player-bar flex items-center">
    <div class="avatar-chip player-avatar">★</div>
    <div class="duel-info">
      <div class="duel-label"><span>TOI · COMMANDANT</span><span class="life-word">VIES</span></div>
      <div class="life-row"><span v-for="n in 3" :key="n" class="life-block" :class="{ empty: n > store.game.players.player.hp }" /></div>
    </div>
    <div class="duel-hp player-hp">{{ store.game.players.player.hp }}<small>/3</small></div>
  </div>

  <div class="command-strip">
    <button class="master-chip" :class="{ ready: store.masterReady, selected: store.game.selection?.type === 'master', locked: !store.masterReady }"
      :disabled="!store.masterReady || store.busy || store.game.phase !== 'placement'"
      @click="store.select({ type: 'master' }); playCue('select')">
      <span class="master-symbol">♛</span>
      <span class="master-copy"><b>{{ master ? CATALOG[master].name.toUpperCase() : 'MASTER' }}</b><small>{{ store.game.players.player.masterUsed ? 'UTILISÉ' : store.masterReady ? 'PRÊT À POSER · LIGNE 1' : `${store.game.players.player.kills}/3 ÉLIMINATIONS` }}</small></span>
      <span class="master-meter">{{ store.game.players.player.masterUsed ? '✓' : store.masterReady ? '⚡' : '🔒' }}</span>
    </button>
    <span v-if="noticeStatus" class="notice-status">{{ noticeStatus }}</span>
  </div>
</template>
