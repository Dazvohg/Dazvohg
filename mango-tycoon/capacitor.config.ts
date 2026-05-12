import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mangotycoon.app',
  appName: 'Mango Tycoon',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#030712',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
}

export default config
