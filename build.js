const { build } = require('electron-builder');
const path = require('path');

const buildConfig = {
  config: {
    appId: 'com.restaurant.system',
    productName: 'Restoran Sistemi',
    directories: {
      output: 'dist'
    },
    files: [
      '**/*',
      '!node_modules/**/*',
      '!dist/**/*',
      '!.git/**/*'
    ],
    win: {
      target: 'nsis',
      icon: 'assets/icon.ico'
    },
    mac: {
      target: 'dmg',
      icon: 'assets/icon.icns'
    },
    linux: {
      target: 'AppImage',
      icon: 'assets/icon.png'
    },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true
    }
  }
};

async function buildApp() {
  try {
    console.log('Building Electron application...');
    const result = await build(buildConfig);
    console.log('Build completed successfully!');
    console.log('Output directory: dist/');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildApp();

