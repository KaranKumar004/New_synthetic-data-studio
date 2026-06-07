import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syntheticdatastudio.app',
  appName: 'Synthetic Data Studio',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
