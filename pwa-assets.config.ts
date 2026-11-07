import { createAppleSplashScreens, defineConfig } from '@vite-pwa/assets-generator/config';

/**
 * Generates only the iOS startup images (splash screens) from the logo. The app icons themselves
 * are the hand-made PNGs from the brand pack in public/ (icon-192, icon-512, icon-maskable-512,
 * apple-touch-icon, favicon-32), so the icon presets below are intentionally empty.
 *
 * Run `npm run icons`, then paste the printed <link rel="apple-touch-startup-image"> tags into
 * index.html (already done; re-run only if the logo or device list changes).
 */
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: { sizes: [], favicons: [] },
    maskable: { sizes: [] },
    apple: { sizes: [] },
    appleSplashScreens: createAppleSplashScreens(
      {
        padding: 0.36, // logo sits small in the middle, like the in-app splash
        resizeOptions: { background: '#F3F5F9', fit: 'contain' }, // --bg (light)
        darkResizeOptions: { background: '#0D1117', fit: 'contain' }, // --bg (dark)
        linkMediaOptions: { log: true, addMediaScreen: true, basePath: '/', xhtml: false },
        png: { compressionLevel: 9, quality: 70 },
        name: (landscape, size, dark) =>
          `splash/apple-splash-${landscape ? 'landscape' : 'portrait'}-${dark ? 'dark-' : ''}${size.width}x${size.height}.png`,
      },
      [
        'iPhone 17 Pro Max',
        'iPhone 17 Pro',
        'iPhone Air',
        'iPhone 16 Pro Max',
        'iPhone 16 Pro',
        'iPhone 16 Plus',
        'iPhone 16',
        'iPhone 14 Plus',
        'iPhone 13 mini',
        'iPhone 11 Pro Max',
        'iPhone 11',
        'iPhone 8 Plus',
        'iPhone SE 4.7"',
      ],
    ),
  },
  images: ['public/logo.svg'],
});
