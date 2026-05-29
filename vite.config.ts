import { defineConfig, createLogger } from 'vite';
import react from '@vitejs/plugin-react';

// Suppress the known missing source-map warning from @mediapipe/tasks-vision
const logger = createLogger();
const originalWarn = logger.warn.bind(logger);
logger.warn = (msg, opts) => {
  if (msg.includes('Failed to load source map')) return;
  originalWarn(msg, opts);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  css: {
    postcss: {
      plugins: [
        (await import('tailwindcss')).default,
        (await import('autoprefixer')).default,
      ],
    },
  },
});
