<script setup lang="ts">
defineProps<{ open: boolean; victory: boolean }>()
defineEmits<{ retry: []; quit: [] }>()
</script>

<template>
  <Transition name="end">
    <div
      v-if="open"
      class="end-screen"
      :class="victory ? 'victory' : 'defeat'"
      role="dialog"
      aria-modal="true"
      :aria-label="victory ? 'Victoire' : 'Défaite'"
    >
      <div class="burst" aria-hidden="true" />
      <p class="comic-title verdict">{{ victory ? 'Victoire !' : 'Défaite…' }}</p>
      <p class="subtitle">
        {{ victory ? 'Les GIFs adverses sont tous K.O. !' : 'GifBot a eu raison de ton équipe.' }}
      </p>
      <nav class="actions">
        <button type="button" class="comic-btn retry" data-autofocus @click="$emit('retry')">
          Réessayer
        </button>
        <button type="button" class="comic-btn quit" @click="$emit('quit')">Quitter</button>
      </nav>
    </div>
  </Transition>
</template>

<style scoped>
.end-screen {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: grid;
  grid-template-rows: 1fr auto auto 1fr auto;
  justify-items: center;
  padding: 0 7cqw calc(7cqh + env(safe-area-inset-bottom));
  /* Heavy blur: the battle stays faintly visible underneath. */
  backdrop-filter: blur(10px) saturate(1.2);
  -webkit-backdrop-filter: blur(10px) saturate(1.2);
  background: rgb(255 214 0 / 0.25);
  overflow: hidden;
}

.defeat {
  background: rgb(20 20 50 / 0.45);
}

.burst {
  position: absolute;
  left: 50%;
  top: 38%;
  width: 200cqh;
  height: 200cqh;
  translate: -50% -50%;
  background: repeating-conic-gradient(rgb(255 255 255 / 0.35) 0deg 8deg, transparent 8deg 16deg);
  mask-image: radial-gradient(circle, #000 10%, transparent 45%);
  animation: spin 30s linear infinite;
}

.defeat .burst {
  background: repeating-conic-gradient(rgb(255 255 255 / 0.12) 0deg 8deg, transparent 8deg 16deg);
}

.verdict {
  grid-row: 2;
  position: relative;
  font-size: 20cqw;
  line-height: 1;
  -webkit-text-stroke: 1cqw var(--ink);
  text-shadow: 1.5cqw 1.5cqw 0 var(--ink);
  animation: slam 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.defeat .verdict {
  color: #90caf9;
  animation: droop 900ms ease-out both;
}

.subtitle {
  grid-row: 3;
  position: relative;
  margin-top: 1em;
  padding: 0.3em 0.8em;
  background: #fff;
  border: var(--ink-width) solid var(--ink);
  font-weight: 700;
  text-align: center;
  transform: rotate(-1.5deg);
  animation: fade-up 400ms 400ms ease-out both;
}

.actions {
  grid-row: 5;
  position: relative;
  display: grid;
  gap: 1em;
  width: 100%;
  animation: fade-up 400ms 600ms ease-out both;
}

.actions .comic-btn {
  width: 100%;
  font-size: 1.6em;
}

.retry {
  --btn-bg: var(--pop-red);
  color: #fff;
  -webkit-text-stroke: 0.3cqw var(--ink);
  paint-order: stroke fill;
}

.quit {
  --btn-bg: #fff;
}

.end-enter-active {
  transition: opacity 300ms ease;
}

.end-enter-from {
  opacity: 0;
}

@keyframes spin {
  to {
    rotate: 1turn;
  }
}

@keyframes slam {
  from {
    transform: scale(3) rotate(-15deg);
    opacity: 0;
  }
  to {
    transform: rotate(-5deg);
  }
}

@keyframes droop {
  from {
    transform: translateY(-30cqh);
    opacity: 0;
  }
  70% {
    transform: translateY(1cqh) rotate(4deg);
  }
  to {
    transform: rotate(3deg);
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(2em);
  }
}
</style>
