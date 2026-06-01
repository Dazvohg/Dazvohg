import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.usechemonei.app',
  appName: 'CheMonei',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0A1628',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
}

export default config
