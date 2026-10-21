<script setup lang="ts">
import frame from '../../../assets/ui/moldura-investigativa.png'
defineProps<{ image: string; name: string; cost: number }>()
</script>

<template>
  <span class="card-artwork"
    ><img
      class="card-illustration"
      :src="image"
      alt=""
      width="1024"
      height="1536"
      decoding="async"
    /><img
      class="card-frame"
      :src="frame"
      alt=""
      aria-hidden="true"
      width="1024"
      height="1536"
    /><span class="card-cost">{{ cost }} <small>PA</small></span
    ><span class="card-name">{{ name }}</span></span
  >
</template>

<style>
.card-artwork {
  display: block;
  position: relative;
  width: 100%;
  aspect-ratio: 2/3;
  container-type: inline-size;
  overflow: hidden;
}
.card-illustration,
.card-frame {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-frame {
  pointer-events: none;
  z-index: 1;
}
.card-artwork .card-name {
  position: absolute;
  z-index: 2;
  left: 13%;
  right: 13%;
  bottom: 5%;
  height: 15%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: none;
  padding: 0;
  min-height: 0;
  font:
    clamp(9px, 9cqw, 20px)/1.15 Georgia,
    serif;
  color: var(--paper);
  text-shadow: 0 1px 3px #000;
}
.card-artwork .card-cost {
  position: absolute;
  z-index: 2;
  top: 5%;
  right: 14%;
  display: flex;
  align-items: baseline;
  gap: 3px;
  padding: 2px 4px;
  border: 1px solid #c79a5388;
  border-radius: 4px;
  background: #112033ed;
  color: var(--paper);
  font-size: clamp(10px, 10cqw, 22px);
  font-weight: 700;
}
.card-cost small {
  font-size: 0.55em;
}
</style>
