# img tools

[![CI](https://github.com/mbianchidev/img-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/mbianchidev/img-tools/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-5b4bd8.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-35c2b8.svg)](https://react.dev/)

A free, open source image workbench for editing one image at a time, entirely in
your browser. Compress, crop, resize, retouch, and convert images without
uploading them to a server.

**[Open the hosted app](https://mbianchidev.github.io/img-tools/)** to start without
installing anything, or run it locally using Node.js or Docker Compose.

<img width="1710" height="950" alt="img tools browser-based image editor" src="https://github.com/user-attachments/assets/7048e793-c35d-4c99-bb6d-fc7929a4b8a7" />

## Features

- **Optimize and convert:** export JPG, PNG, or WebP using a quality setting or a
  maximum file-size target, with automatic downscaling when needed.
- **Crop and resize:** drag the crop frame, choose aspect-ratio presets, or use
  precise controls. Rotate, mirror, and scale from 10% to 400% while keeping the
  output aspect ratio.
- **Retouch locally:** adjust light, contrast, color, blur, and vignette. Remove
  connected near-solid backgrounds with tolerance and feathering controls, or
  fill transparent regions with a solid color.
- **Add layers:** position, rotate, and resize text, searchable emoji, and local
  image stickers. Add a positioned watermark or tile it across the image.
- **Mask and revise:** drag and resize rectangular, rounded, or elliptical blur
  masks, and undo or redo edits without changing the original file.

## Privacy

Images stay in the current browser tab. There is no backend, upload endpoint,
analytics integration, or account system. Fonts are bundled with the app and
emoji use the browser's native rendering.

There is no saved project or automatic recovery. Closing or refreshing the tab,
or choosing **New image**, clears the open image and edit history. Export a result
before leaving; downloads are separate files and do not overwrite the source.

## Quick start

### Local development

Requirements: Git, Node.js **22.22.2 or newer**, and npm. Use Node.js **26.12.1**
(`.nvmrc`) to match CI, GitHub Pages, and Docker builds. The app is a web
application, not a native desktop application.

```bash
git clone https://github.com/mbianchidev/img-tools.git
cd img-tools
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Choose **Try the
demo image** to open the editor with a generated sample, then follow
[Using the editor](#using-the-editor) to download your first result.

### Docker Compose

Requirements: a running Docker engine and Docker Compose v2. Node.js and npm run
inside the build container, so they are not required on the host. Clone the
repository and run these commands from its root:

```bash
docker compose build --no-cache
docker compose up
```

Open `http://localhost:8080` once the web service starts. Set `IMG_TOOLS_PORT` to
use another host port, for example in a POSIX shell:

```bash
IMG_TOOLS_PORT=3000 docker compose up
```

Stop and remove the service containers with `docker compose down`.

## Using the editor

1. Drop an image on the home page, select **Choose image**, or choose **Try the
   demo image**. The file picker accepts JPG, PNG, WebP, AVIF, GIF, and SVG;
   decoding depends on your browser.
2. Pick a tool from the left rail. Changes appear in the live preview.
3. Drag crop frames, stickers, and blur masks directly on the image. Resize crop
   and blur masks from any corner, or use the precise controls. **Resize** lets
   you set a scale or an output width or height while keeping the aspect ratio.
4. Choose **Export**, select JPG, PNG, or WebP, and choose **Quality** or
   **Maximum MB**. Select **Download image** to save a new `*-edited` file.

The default export is WebP at 86% quality. Maximum-size export may reduce the
dimensions shown in the editor; check the download status for the actual size
and any warning that the target could not be reached.

Keyboard shortcuts work when focus is outside an input, select, or text area:

| Action | macOS | Windows/Linux |
| --- | --- | --- |
| Undo | `⌘ Z` | `Ctrl Z` |
| Redo | `⇧ ⌘ Z` | `Ctrl Shift Z` |
| Open export | `⌘ E` | `Ctrl E` |

## Browser support and limits

Use a current Chrome, Edge, Firefox, or Safari with the Canvas and File APIs.
Image decoding, encoding, and available memory depend on the browser.

- Source images are limited to 80 MiB and custom image stickers to 20 MiB
  (displayed as MB in the interface). Stickers accept JPG, PNG, WebP, AVIF, or
  GIF. Multiple dropped files are not processed as a batch.
- Animated images export as a still image, and SVG input is rasterized. Output
  formats are JPG, PNG, and WebP only.
- PNG export is lossless, so its quality slider does not affect file size.
  Maximum-size mode can still shrink its dimensions. File-size targets are
  best-effort, not guaranteed.
- PNG and WebP can preserve transparency. JPG cannot: remaining transparent
  areas are filled with white unless you add a solid background first.
- Background removal targets backgrounds connected to the image edge; it is not
  AI subject segmentation. Upscaling uses browser resampling and does not
  invent new detail.
- Preview rendering is limited to 1,500 pixels on the longest cropped edge;
  export renders again from the source. Exports over 100 million pixels or
  32,767 pixels on either edge are rejected. Reduce the resize scale or crop
  the image; individual browsers may have lower practical memory limits.

## Build and self-host

```bash
npm run build
npm run preview
```

The build writes static HTML, CSS, JavaScript, and fonts to `dist/`. Preview
normally serves that build at `http://localhost:4173`; it is for local checking,
not a production application server.

Deploy the contents of `dist/` to a static host. For a subdirectory deployment,
set Vite's base path at build time, for example:

```bash
npm run build -- --base=/img-tools/
```

No API keys, database, or application runtime environment variables are needed.
`IMG_TOOLS_PORT` only changes the Docker Compose host port. The GitHub Pages
workflow supplies its base path automatically.

See [Self-hosting](docs/self-hosting.md) for static hosting, Docker, GitHub Pages,
and reverse-proxy details, or [Architecture](docs/architecture.md) for the local
image pipeline and export behavior.

## Development

```bash
npm run lint       # ESLint
npm test           # Vitest and Testing Library
npm run build      # TypeScript and production bundle
npm run check      # all checks
```

The editor uses React 19, strict TypeScript, Vite, and the browser Canvas API.

Contributions are welcome. Read [Contributing](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request. Use synthetic
images for tests and bug reports, never personal or customer images.

For bugs or feature requests, see [Support](SUPPORT.md). Report vulnerabilities
privately using the [Security policy](SECURITY.md).

## License

Released under the [MIT License](LICENSE).
