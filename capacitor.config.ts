import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.godprodigy.app',
  appName: 'God Prodigy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
