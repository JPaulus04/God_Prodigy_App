import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.godprodigy.app',
  appName: 'God Prodigy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: false,
    // Lock to portrait only
    preferredContentMode: 'mobile',
  },
};

export default config;
