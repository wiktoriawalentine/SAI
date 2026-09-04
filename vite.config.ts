import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative path is safer for GitHub Pages, especially if the repository name changes.
  base: './',
});
