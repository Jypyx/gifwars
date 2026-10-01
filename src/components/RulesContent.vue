<script setup lang="ts">
import { TEAM_SIZE, TURN_DURATION_SECONDS } from '@/config/gameRules'
import { STATUS_INFO } from '@/config/statusInfo'
import { SYNERGIES } from '@/data/synergies'
</script>

<template>
  <div class="rules">
    <section>
      <h3>Le combat</h3>
      <ul>
        <li>Chaque équipe compte {{ TEAM_SIZE }} GIFs tirés au sort.</li>
        <li>
          À ton tour : <strong>attaque</strong> ou fais un <strong>switch</strong> (le switch
          consomme ton tour).
        </li>
        <li>
          {{ TURN_DURATION_SECONDS }} secondes par tour, sinon l’attaque de base part toute seule.
        </li>
        <li>Un GIF K.O. est remplacé aussitôt, sans perdre ton tour.</li>
        <li>Mets K.O. les {{ TEAM_SIZE }} GIFs adverses pour gagner !</li>
      </ul>
    </section>
    <section>
      <h3>Les attaques</h3>
      <ul>
        <li><strong class="physique">Physique</strong> : illimitée.</li>
        <li><strong class="magique">Magique</strong> : quelques utilisations par combat.</li>
        <li>
          <strong class="speciale">Spéciale</strong> : une seule fois, réservée aux Légendaires.
        </li>
      </ul>
    </section>
    <section>
      <h3>Les statuts</h3>
      <ul>
        <li v-for="(info, key) in STATUS_INFO" :key="key">
          <strong :style="{ color: info.color }">{{ info.label }}</strong> : {{ info.description }}
        </li>
      </ul>
    </section>
    <section>
      <h3>Les synergies</h3>
      <p>Certains duos soignent leurs membres de 1 PV par tour :</p>
      <ul>
        <li v-for="synergy in SYNERGIES" :key="synergy.id">{{ synergy.name }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.rules {
  display: grid;
  gap: 0.9em;
  font-size: 0.95em;
  line-height: 1.35;
}

h3 {
  display: inline-block;
  margin-bottom: 0.3em;
  padding: 0 0.4em;
  background: var(--pop-yellow);
  border: 2px solid var(--ink);
  font-family: var(--font-display);
  font-size: 1.15em;
  font-weight: normal;
  letter-spacing: 0.04em;
  transform: rotate(-1.5deg);
}

ul {
  display: grid;
  gap: 0.25em;
  padding-left: 1.1em;
}

.physique {
  color: #e53935;
}

.magique {
  color: #1e88e5;
}

.speciale {
  color: #f57f17;
}
</style>
