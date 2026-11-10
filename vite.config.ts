import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {VitePWA} from 'vite-plugin-pwa';
export default defineConfig({build:{rollupOptions:{output:{manualChunks:{react:['react','react-dom','react-router-dom'],database:['dexie','@tanstack/react-query']}}}},plugins:[react(),tailwindcss(),VitePWA({registerType:'autoUpdate',includeAssets:['icon.svg','icon-192.png','icon-512.png'],manifest:{name:'FIELD2FUSION Asset Collector',short_name:'FIELD2FUSION',description:'Offline-first enterprise asset collection',theme_color:'#173e34',background_color:'#f6f7f4',display:'standalone',start_url:'/',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png'},{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]},workbox:{navigateFallback:'/index.html',globPatterns:['**/*.{js,css,html,svg,png,woff2}'],cleanupOutdatedCaches:true}})]});
