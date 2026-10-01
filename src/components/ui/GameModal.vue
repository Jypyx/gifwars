<script setup lang="ts">
import { nextTick, onBeforeUnmount, useId, useTemplateRef, watch } from 'vue'
import IconButton from './IconButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    /** Can be dismissed (Escape, cross, backdrop). */
    closable?: boolean
    showCross?: boolean
    closeOnBackdrop?: boolean
    fullscreen?: boolean
  }>(),
  { title: undefined, closable: true, showCross: true, closeOnBackdrop: true, fullscreen: false },
)

const emit = defineEmits<{ close: [] }>()

const panel = useTemplateRef<HTMLElement>('panel')
const titleId = useId()
let previousFocus: HTMLElement | null = null

function close() {
  if (props.closable) emit('close')
}

function onBackdrop() {
  if (props.closable && props.closeOnBackdrop) emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null
      window.addEventListener('keydown', onKeydown)
      await nextTick()
      panel.value?.querySelector<HTMLElement>('[data-autofocus], button')?.focus()
    } else {
      window.removeEventListener('keydown', onKeydown)
      previousFocus?.focus?.()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="modal">
    <div v-if="open" class="modal-root" :class="{ fullscreen }">
      <div class="backdrop" data-testid="backdrop" @click="onBackdrop" />
      <div
        ref="panel"
        class="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
      >
        <header v-if="title || (closable && showCross)" class="header">
          <h2 v-if="title" :id="titleId" class="title">{{ title }}</h2>
          <IconButton
            v-if="closable && showCross"
            class="close"
            icon="close"
            label="Fermer"
            size="sm"
            @click="close"
          />
        </header>
        <div class="body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-root {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  /* Without explicit tracks the grid would size to its content (e.g. a wide carousel). */
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  place-items: center;
  padding: 5cqw;
}

.backdrop {
  /* Fixed: dims the whole window, including the sunburst on both sides of the frame. */
  position: fixed;
  inset: 0;
  background: rgb(10 10 30 / 0.6);
}

.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.8em;
  width: 100%;
  max-height: 100%;
  padding: 1em;
  background: #fff;
  border: var(--ink-width) solid var(--ink);
  border-radius: 0.6em;
  box-shadow: 0.35em 0.35em 0 var(--ink);
}

.fullscreen {
  padding: 0;
}

.fullscreen .panel {
  height: 100%;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  padding: calc(1em + env(safe-area-inset-top)) 1em calc(1em + env(safe-area-inset-bottom));
  background-color: var(--paper);
  background-image: radial-gradient(rgb(0 0 0 / 0.09) 1.5px, transparent 1.5px);
  background-size: 3cqw 3cqw;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.6em;
  min-height: max(40px, 10cqw);
}

.title {
  flex: 1;
  font-family: var(--font-display);
  font-size: 1.7em;
  font-weight: normal;
  letter-spacing: 0.04em;
  line-height: 1;
}

.close {
  margin-left: auto;
}

.body {
  min-height: 0;
  flex: 1;
  overflow: hidden auto;
  scrollbar-width: none;
}

.body::-webkit-scrollbar {
  display: none;
}

.footer {
  display: flex;
  gap: 0.6em;
}

.footer > :deep(*) {
  flex: 1;
}

/* Enter / leave */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}

.modal-enter-active .panel {
  animation: pop-in 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@keyframes pop-in {
  from {
    transform: scale(0.7) rotate(-3deg);
  }
}
</style>
