<template>
  <section class="world-map" aria-labelledby="map-title">
    <div class="map-heading">
      <p class="eyebrow">Arquivo de mundos · 01</p>
      <h1 id="map-title">Toda cidade guarda<br />uma história oculta.</h1>
      <p class="muted">Escolha seu destino. Siga os vestígios.</p>
    </div>
    <svg class="map-art" viewBox="0 0 800 600" aria-hidden="true">
      <defs>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#e8ddc5" stroke-opacity=".06" />
        </pattern>
      </defs>
      <rect width="800" height="600" fill="url(#grid)" />
      <path d="M95 310 145 210 245 180 320 245 405 260 438 355 355 430 240 460 155 398Z" />
      <path d="M510 155 615 118 690 180 660 270 553 290 490 226Z" />
      <path d="M470 420 560 365 650 415 690 490 600 530 510 505Z" />
      <path class="map-route" d="M285 320 Q410 180 585 210 M285 320 Q420 470 575 445" />
    </svg>
    <div class="map-pin">
      <span class="pin-ring" aria-hidden="true">◈</span><strong>Cidade das Brumas</strong
      ><small>Mundo disponível</small>
    </div>
    <span class="locked-world locked-north">◇ Arquivo lacrado</span
    ><span class="locked-world locked-south">◇ Em breve</span>
    <p class="map-coordinate">VESPERA / 22°14′ · ARQUIVO PATRIMONIAL</p>
  </section>
</template>
