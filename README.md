# Sun Seen

Sun Seen is an offline-friendly solar calendar. It calculates sunrise, sunset, solar noon, daylight, and night hours locally in the browser.

## Run Locally

```sh
npm run dev
```

Then open:

```txt
http://localhost:5173/
```

## Build Static Files

```sh
npm run build
```

This creates a `dist/` folder containing the files that can be uploaded to any static host.

## Deploy As A Web App

Use any static web host:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

For Netlify or similar drag-and-drop hosting, run `npm run build` and upload the `dist/` folder.

For GitHub Pages, publish the repository root or the generated `dist/` folder. The app uses relative paths so it can run from a custom domain root or a project subfolder.

## Install On iPhone

After the app is hosted online:

1. Open the app URL in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Launch Sun Seen from the new home screen icon.

No API keys are required for the current version.
