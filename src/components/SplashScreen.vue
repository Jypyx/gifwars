<script setup lang="ts">
import { assetUrl } from '../services/urls'

defineEmits<{ start: [] }>()

const fighterGif = assetUrl('gifs/fighter.gif')
const assassinGif = assetUrl('gifs/assassin.gif')
</script>

<template>
  <main class="splash-shell">
    <div class="splash-noise" aria-hidden="true" />

    <header class="splash-top">
      <span class="splash-monogram" aria-hidden="true">GW<span>✦</span></span>
      <span class="splash-edition">PIXEL ARENA <b>／</b> ÉDITION 01</span>
      <span class="splash-online"><i /> PRÊT À JOUER</span>
    </header>

    <section class="splash-intro" aria-labelledby="splash-title">
      <div class="splash-kicker"><span /> LE CHAMP DE BATAILLE T’ATTEND <span /></div>
      <h1 id="splash-title" class="splash-title" aria-label="Gif Wars"><span>Gif</span><span>Wars</span></h1>
      <p class="splash-tagline">DÉPLOIE. COMBATS. DOMINE.</p>
      <div class="splash-title-rule" aria-hidden="true"><span>✦</span></div>
    </section>

    <section class="splash-arena" aria-label="Aperçu de l’arène">
      <div class="splash-arena-head"><span>ARÈNE // 01</span><span>DUEL TACTIQUE</span></div>
      <div class="splash-lanes" aria-hidden="true"><span /><span /><span /></div>
      <div class="splash-spark spark-one" aria-hidden="true">✦</div>
      <div class="splash-spark spark-two" aria-hidden="true">✦</div>
      <div class="splash-fighter splash-fighter-player">
        <div class="splash-fighter-frame"><img :src="fighterGif" alt="" /></div>
        <span>TON ÉQUIPE</span>
      </div>
      <div class="splash-versus" aria-hidden="true"><span>VS</span></div>
      <div class="splash-fighter splash-fighter-enemy">
        <div class="splash-fighter-frame"><img :src="assassinGif" alt="" /></div>
        <span>LE BOT</span>
      </div>
      <div class="splash-arena-foot"><span>● 3 COULOIRS</span><span>● 1 SEUL VAINQUEUR</span></div>
    </section>

    <footer class="splash-bottom">
      <div class="splash-facts" aria-label="À propos du jeu">
        <span><b>01</b><small>JOUEUR</small></span>
        <span><b>10</b><small>GIFS ANIMÉS</small></span>
        <span><b>∞</b><small>REVANCHES</small></span>
      </div>
      <button class="splash-start" type="button" @click="$emit('start')">
        <span>Lancer une partie</span><span aria-hidden="true">↗</span>
      </button>
      <p>CHOISIS TON MASTER ET PRENDS LE CONTRÔLE DE L’ARÈNE</p>
    </footer>
  </main>
</template>

<style scoped>
.splash-shell {
  --cream: #fff0cb;
  --gold: #f7d47d;
  --cyan: #87eee5;
  position: relative;
  isolation: isolate;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  width: min(100vw, 500px, 56.25dvh);
  min-height: 100dvh;
  height: 100dvh;
  margin: auto;
  overflow: auto;
  scrollbar-width: none;
  border-inline: 1px solid #7de8e35c;
  background:
    radial-gradient(ellipse at 50% 42%, #24506366, transparent 52%),
    radial-gradient(ellipse at 18% 76%, #2c778333, transparent 43%),
    #0b1525;
  box-shadow: 0 0 80px #000c, 0 0 100px #56d7dc22;
}
.splash-shell::-webkit-scrollbar { display: none }
.splash-shell::before, .splash-shell::after { content: ''; position: absolute; inset: 0; pointer-events: none }
.splash-shell::before { z-index: -1; background-image: linear-gradient(#6cced70b 1px, transparent 1px), linear-gradient(90deg, #6cced70b 1px, transparent 1px); background-size: 32px 32px }
.splash-shell::after { z-index: 5; background: repeating-linear-gradient(to bottom, transparent 0 3px, #0002 3px 4px); opacity: .25 }
.splash-noise { position: absolute; inset: 0; pointer-events: none; opacity: .55; background: linear-gradient(125deg, transparent 32%, #69e5ed0a 50%, transparent 68%) }
.splash-top { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; min-height: 64px; padding: 12px 22px; border-bottom: 1px solid #83e5da40; background: #0a1522a6 }
.splash-monogram { color: var(--gold); font-size: 26px; font-weight: 1000; letter-spacing: -4px; line-height: 1; text-shadow: 2px 2px #874f67, 0 0 14px #ecc87277 }
.splash-monogram span { position: relative; top: -11px; left: 1px; color: #ff849b; font-size: 10px; letter-spacing: 0 }
.splash-edition { flex: 1; color: #95c2c6; font-size: 8px; font-weight: 900; letter-spacing: 1.3px; white-space: nowrap }
.splash-edition b { color: #eac47e }
.splash-online { color: #a4e5d1; font-size: 8px; font-weight: 900; letter-spacing: .5px; white-space: nowrap }
.splash-online i { display: inline-block; width: 6px; height: 6px; margin-right: 4px; border-radius: 50%; background: #80f7c7; box-shadow: 0 0 9px #80f7c7; vertical-align: 1px; animation: splash-pulse 1.7s infinite }
.splash-intro { position: relative; z-index: 1; flex: none; padding: clamp(23px, 5dvh, 50px) 20px 12px; text-align: center }
.splash-kicker { display: flex; align-items: center; justify-content: center; gap: 9px; color: #9ed6d6; font-size: 9px; font-weight: 900; letter-spacing: 1.9px; white-space: nowrap }
.splash-kicker span { width: 17px; height: 1px; background: #73d8d1 }
.splash-title { display: flex; justify-content: center; gap: .19em; margin: 13px 0 0; color: var(--cream); font-family: Impact, 'Arial Black', 'Courier New', sans-serif; font-size: clamp(52px, 18cqw, 93px); font-stretch: condensed; font-weight: 1000; letter-spacing: -.055em; line-height: 1; text-transform: uppercase; transform: skew(-4deg); filter: drop-shadow(4px 6px 0 #412841) }
.splash-title span:first-child { color: var(--gold); text-shadow: 0 0 24px #e4a76666 }
.splash-title span:last-child { color: var(--cream); text-shadow: 0 0 24px #fff0cb33 }
.splash-tagline { margin: 13px 0 0; color: var(--cyan); font-size: 11px; font-weight: 1000; letter-spacing: 2.6px }
.splash-title-rule { display: flex; align-items: center; gap: 10px; margin: 22px auto 0; width: min(76%, 300px); color: #f5d482; font-size: 12px }
.splash-title-rule::before, .splash-title-rule::after { content: ''; height: 1px; flex: 1; background: linear-gradient(90deg, transparent, #e9c88088) }
.splash-title-rule::after { transform: rotate(180deg) }
.splash-arena { position: relative; z-index: 1; flex: 1 1 270px; min-height: 195px; margin: 4px 24px 0; overflow: hidden; border: 1px solid #69d7db9c; background: radial-gradient(ellipse at center, #24455c 0%, #152a3d 47%, #0d1d30 100%); box-shadow: inset 0 0 32px #06101f, 0 0 32px #57d7da21 }
.splash-arena::before, .splash-arena::after { content: ''; position: absolute; z-index: 1; width: 16px; height: 16px; border-color: #f2d384; border-style: solid }
.splash-arena::before { top: -1px; left: -1px; border-width: 2px 0 0 2px }
.splash-arena::after { right: -1px; bottom: -1px; border-width: 0 2px 2px 0 }
.splash-arena-head, .splash-arena-foot { position: absolute; z-index: 3; right: 13px; left: 13px; display: flex; justify-content: space-between; color: #9dd4d5; font-size: 8px; font-weight: 900; letter-spacing: 1.2px }
.splash-arena-head { top: 12px }.splash-arena-foot { bottom: 11px; color: #b6a989 }
.splash-lanes { position: absolute; inset: 33px 0 27px; display: flex; transform: perspective(320px) rotateX(27deg) scale(1.15); opacity: .5 }
.splash-lanes span { flex: 1; border-right: 1px solid #76d1da59; border-left: 1px solid #76d1da20; background: repeating-linear-gradient(to bottom, #8bebdf27 0 1px, transparent 1px 30px) }
.splash-lanes span:nth-child(2) { background-color: #70d9d80c }
.splash-fighter { position: absolute; z-index: 2; top: 50%; display: flex; flex-direction: column; align-items: center; gap: 10px; transform: translateY(-43%); animation: splash-bob 2.2s ease-in-out infinite alternate }
.splash-fighter-player { left: 11% }.splash-fighter-enemy { right: 11%; animation-delay: -1.1s }
.splash-fighter-frame { display: grid; place-items: center; width: clamp(74px, 23cqw, 116px); height: clamp(74px, 23cqw, 116px); border: 2px solid #8ce8d9; background: radial-gradient(circle at 50% 75%, #438b8d, #173547 67%); box-shadow: 4px 5px 0 #07111e, 0 0 24px #6ce3d35e, inset 0 0 16px #73e1de33; transform: rotate(-4deg) }
.splash-fighter-enemy .splash-fighter-frame { border-color: #ff93a3; background: radial-gradient(circle at 50% 75%, #915669, #3b293e 67%); box-shadow: 4px 5px 0 #07111e, 0 0 24px #ff80965e, inset 0 0 16px #ff93a333; transform: rotate(4deg) }
.splash-fighter-frame img { width: 83%; height: 83%; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(3px 4px 0 #07101c88) }
.splash-fighter > span { padding: 5px 9px; border: 1px solid #6dd9d0; background: #102d3e; color: #baf9e8; font-size: 9px; font-weight: 1000; letter-spacing: 1px; white-space: nowrap }
.splash-fighter-enemy > span { border-color: #d47a90; background: #382639; color: #ffc2c5 }
.splash-versus { position: absolute; z-index: 3; top: 50%; left: 50%; display: grid; place-items: center; width: 58px; height: 58px; border: 2px solid var(--gold); border-radius: 50%; background: #14273a; color: #ffe4a3; box-shadow: 0 0 0 6px #14273aaa, 0 0 25px #f3c77885; transform: translate(-50%, -50%) rotate(-8deg) }
.splash-versus span { font-family: Impact, 'Arial Black', sans-serif; font-size: 27px; font-style: italic; letter-spacing: -1px; text-shadow: 2px 2px #8c5862 }
.splash-spark { position: absolute; color: #f9d389; font-size: 18px; text-shadow: 0 0 12px #ffdf98; animation: splash-twinkle 1.8s infinite alternate }.spark-one { top: 26%; left: 41% }.spark-two { right: 38%; bottom: 22%; font-size: 11px; animation-delay: -.7s }
.splash-bottom { position: relative; z-index: 1; flex: none; padding: 20px 25px max(22px, env(safe-area-inset-bottom)); text-align: center }
.splash-facts { display: grid; grid-template-columns: repeat(3, 1fr); margin-bottom: 17px; border-block: 1px solid #6aaab047 }
.splash-facts > span { display: flex; flex-direction: column; gap: 2px; padding: 10px 0 }.splash-facts > span + span { border-left: 1px solid #6aaab047 }
.splash-facts b { color: #f9dc95; font-size: 18px; line-height: 1 }.splash-facts small { color: #90c7ca; font-size: 8px; font-weight: 900; letter-spacing: 1px }
.splash-start { display: flex; align-items: center; justify-content: center; gap: 16px; width: 100%; min-height: 58px; padding: 11px 17px; border: 2px solid #fff1b6; background: linear-gradient(#ffe09a, #efbd61); box-shadow: 5px 5px 0 #995965, 0 0 28px #f2cd6b45; color: #202536; font-size: 15px; font-weight: 1000; letter-spacing: 1px; text-transform: uppercase; transition: transform .14s, box-shadow .14s, filter .14s }
.splash-start:hover { transform: translate(-2px, -2px); box-shadow: 7px 7px 0 #995965, 0 0 36px #f2cd6b70; filter: brightness(1.06) }.splash-start:active { transform: translate(4px, 4px); box-shadow: 1px 1px 0 #995965 }
.splash-start span:last-child { font-size: 25px; line-height: .5 }
.splash-bottom p { margin: 16px 0 0; color: #88aeb6; font-size: 8px; font-weight: 900; letter-spacing: 1.1px; line-height: 1.4 }
@keyframes splash-pulse { 50% { opacity: .35 } }
@keyframes splash-bob { to { translate: 0 -7px } }
@keyframes splash-twinkle { to { opacity: .25; transform: scale(.7) } }
@media (max-width: 390px) { .splash-top { padding-inline: 14px }.splash-edition { font-size: 7px; letter-spacing: .7px }.splash-online { font-size: 7px }.splash-arena { margin-inline: 15px }.splash-bottom { padding-inline: 17px }.splash-fighter-player { left: 8% }.splash-fighter-enemy { right: 8% } }
@media (max-height: 700px) { .splash-top { min-height: 49px; padding-block: 8px }.splash-intro { padding-top: 16px; padding-bottom: 5px }.splash-title { margin-top: 7px; font-size: clamp(52px, 16cqw, 76px) }.splash-tagline { margin-top: 6px }.splash-title-rule { margin-top: 9px }.splash-arena { min-height: 165px }.splash-bottom { padding-top: 10px; padding-bottom: max(12px, env(safe-area-inset-bottom)) }.splash-facts { margin-bottom: 11px }.splash-facts > span { padding-block: 7px }.splash-start { min-height: 49px }.splash-bottom p { margin-top: 10px } }
@media (prefers-reduced-motion: reduce) { .splash-shell *, .splash-shell *::before, .splash-shell *::after { animation-duration: .01ms !important; transition-duration: .01ms !important } }
</style>
