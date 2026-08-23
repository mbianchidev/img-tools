# Architecture

img tools is a static React application. It has no application server and no
database.

## Runtime flow

1. `src/lib/files.ts` validates a selected file and creates a temporary local
   object URL.
2. `src/hooks/useHistory.ts` keeps non-destructive editor state with undo and redo.
3. `src/lib/imageEngine.ts` renders a bounded preview from the source image and
   the current edit state.
4. Export reruns the same pipeline at the requested output scale.
5. `src/lib/exportImage.ts` encodes JPG, PNG, or WebP and creates a local browser
   download.

No image bytes cross a network boundary.

## Image pipeline

The rendering order is:

1. crop;
2. connected-background removal;
3. rotation and mirroring;
4. color filters and whole-image blur;
5. vignette and shape-clipped selective blur regions;
6. text, emoji sticker, and local image sticker layers;
7. watermark;
8. export resize and encoding.

Crop regions, blur masks, and layer positions use normalized coordinates, so
pointer-based preview edits and full-resolution export produce the same
composition. Pointer gestures use transient history updates and commit as one
undo step when the gesture ends.

The searchable emoji picker is code-split and loaded only when opened. Custom
sticker images are decoded into local data URLs; their bytes never leave the
browser tab.

## Target-size compression

Lossy formats use a bounded quality search. If the lowest useful quality still
misses the requested size, or the output is PNG, the exporter calculates a new
dimension scale from the square root of the byte ratio. It repeats with guarded
limits and reports when the target cannot be reached.

## Safety limits

Preview rendering is capped at 1,500 pixels on the longest cropped edge. Export
is rejected before exceeding 100 million pixels or a 32,767-pixel canvas edge,
which avoids common browser crashes and silent empty downloads.
