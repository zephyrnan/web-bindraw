<template>
  <div id="app" class="h-screen w-screen overflow-hidden">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// 简化版 App.vue - 图形编辑器独立应用
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
               'Helvetica Neue', Arial, sans-serif;
}
</style>
