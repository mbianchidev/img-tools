# img tools

[![CI](https://github.com/mbianchidev/img-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/mbianchidev/img-tools/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-5b4bd8.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-35c2b8.svg)](https://react.dev/)

A free, open source image workbench that runs entirely in the browser. Compress,
crop, resize, retouch, and convert images without uploading them to a server.

## Features

- **Compress by quality or maximum size** — choose an exact quality, or provide a
  maximum MB target and let the export pipeline tune quality and dimensions.
- **Crop, rotate, and mirror** — use common aspect ratios or precise edge controls.
- **Convert formats** — export any browser-readable image to JPG, PNG, or WebP.
- **Add text and stickers** — layer, position, rotate, recolor, and resize additions.
- **Apply effects and filters** — adjust light, contrast, color, blur, and vignette.
- **Remove backgrounds** — clear a connected near-solid background with adjustable
  tolerance and feathering.
- **Blur selected areas** — cover faces, addresses, or any rectangular region.
- **Resize and upscale** — export from 10% to 400% with high-quality resampling.
- **Add solid backgrounds** — fill transparent or removed areas with any color.
- **Add watermarks** — place a corner mark or tile it across the image.
- **Undo and redo** — edit non-destructively until download.

## Privacy

Images stay in the current browser tab. There is no backend, upload endpoint,
analytics integration, or account system. Closing or refreshing the tab clears the
open image and edit history.

## Quick start

### Local development

Requirements: Node.js 22.22.2 or newer and npm 11 or newer.

```bash
git clone https://github.com/mbianchidev/img-tools.git
cd img-tools
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

### Docker Compose

```bash
docker compose build --no-cache
docker compose up
```

Open `http://localhost:8080`. Set `IMG_TOOLS_PORT` to use another host port:

```bash
IMG_TOOLS_PORT=3000 docker compose up
```

## Using the editor

1. Drop an image on the home page or choose **Try the demo image**.
2. Pick a tool from the left rail. Changes appear in the live preview.
3. Drag selected text, stickers, and blur regions directly on the image, or use
   the precise controls.
4. Choose **Export**, select JPG, PNG, or WebP, then download the result.

Keyboard shortcuts:

| Action | macOS | Windows/Linux |
| --- | --- | --- |
| Undo | `⌘ Z` | `Ctrl Z` |
| Redo | `⇧ ⌘ Z` | `Ctrl Shift Z` |
| Open export | `⌘ E` | `Ctrl E` |

## Browser support and limits

The current versions of Chrome, Edge, Firefox, and Safari are supported.

- Browser decoding determines which source formats can be opened.
- Animated GIFs are edited as a single frame.
- Background removal targets backgrounds connected to the image edge; it is not
  generative subject segmentation.
- Upscaling uses high-quality resampling and does not invent new detail.
- Very large exports are capped before they exceed common browser canvas limits.

## Development

```bash
npm run lint       # ESLint
npm test           # Vitest and Testing Library
npm run build      # TypeScript and production bundle
npm run check      # all checks
```

The editor is strict TypeScript with React and the browser Canvas API. See:

- [Architecture](docs/architecture.md)
- [Self-hosting](docs/self-hosting.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

Released under the [MIT License](LICENSE).
