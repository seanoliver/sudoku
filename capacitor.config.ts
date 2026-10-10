import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.seanoliver.sudoku',
  appName: 'Sudoku',
  webDir: 'out',
  ios: { contentInset: 'never' },
};

export default config;
