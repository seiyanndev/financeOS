# Finance OS logo

Open `preview.html` in a browser to see the animations.

## Files

| File | Use it for |
|---|---|
| `svg/finance-os-logo.svg` | The logo, no motion. Headers, docs, anywhere. |
| `svg/finance-os-logo-animated.svg` | Plays the intro once when it loads. Works in a plain `<img>`. |
| `svg/finance-os-loader.svg` | Bars loop. Use as a loading or syncing indicator. |
| `react/AnimatedLogo.tsx` + `AnimatedLogo.css` | React component with all three modes. |
| `pwa-icons/` | Icons for the PWA manifest, Apple touch icon and favicon. |
| `reference/original.png` | The source image the vector was redrawn from. |

## React

```tsx
import { AnimatedLogo } from "./components/AnimatedLogo";

<AnimatedLogo variant="intro" size={120} />            // splash screen, plays once
<AnimatedLogo variant="intro" size={120} replayOnClick /> // tap to replay
<AnimatedLogo variant="loader" size={48} />            // while data loads or syncs
<AnimatedLogo variant="static" size={32} />            // no motion
```

The intro takes about 1.5 s. Everything respects the system "reduce motion" setting: the intro shows the finished logo straight away and the loader slows down.

## PWA manifest (vite-plugin-pwa)

Copy `pwa-icons/*` into `public/`, then:

```ts
VitePWA({
  manifest: {
    name: "Finance OS",
    short_name: "Finance OS",
    theme_color: "#0532D4",
    background_color: "#F3F5F9",
    icons: [
      { src: "icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  }
})
```

In `index.html`:

```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

## Colors

| Role | Hex |
|---|---|
| Tile blue | `#0532D4` |
| F and tall bar | `#FFFFFF` |
| Short bar (saved) | `#86EDB4` |
| Middle bar (spent) | `#FFAE73` |
