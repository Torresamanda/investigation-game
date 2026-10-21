<script setup lang="ts">
import worldMap from '../../../../assets/world/word-map.png'
</script>

<template>
  <section class="world-map" aria-labelledby="map-title">
    <div class="map-heading">
      <p class="eyebrow">Arquivo de mundos · 01</p>
      <h1 id="map-title">Toda cidade guarda<br />uma história oculta.</h1>
      <p class="muted">Escolha seu destino. Siga os vestígios.</p>
    </div>
    <img class="map-art" :src="worldMap" alt="" />
    <div class="map-pin">
      <span class="pin-ring" aria-hidden="true">◈</span><strong>Cidade das Brumas</strong
      ><small>Mundo disponível</small>
    </div>
    <span class="locked-world locked-north">◇ Arquivo lacrado</span
    ><span class="locked-world locked-south">◇ Em breve</span>
    <p class="map-coordinate">VESPERA / 22°14′ · ARQUIVO PATRIMONIAL</p>
  </section>
</template>
