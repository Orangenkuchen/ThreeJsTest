import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
   plugins: [],
   base: '/ThreeJsTest/',
   build: {
      sourcemap: true,
      minify: false
   },
})