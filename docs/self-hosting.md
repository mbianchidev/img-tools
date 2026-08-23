# Self-hosting

The production artifact is static HTML, CSS, JavaScript, and local font files.

## Docker Compose

```bash
docker compose build --no-cache
docker compose up -d
```

The default address is `http://localhost:8080`. Set `IMG_TOOLS_PORT` to change
the host port.

## Static hosting

```bash
npm ci
npm run build
```

Publish the contents of `dist/` to any static host. Configure unknown paths to
fall back to `index.html`.

## GitHub Pages

The Pages workflow builds the same static application with the repository base
path reported by GitHub, then publishes `dist/`. It deploys when `main` changes
and can also be run manually from the Actions tab.

In **Settings → Pages**, set **Source** to **GitHub Actions**. The standard
`npm run build` command remains unchanged for Docker and other static hosts.

## Reverse proxy

The bundled Nginx configuration adds baseline browser security headers and
long-lived caching for hashed assets. When adding another proxy, preserve:

- `X-Content-Type-Options: nosniff`;
- a restrictive `Content-Security-Policy`;
- `Referrer-Policy: no-referrer`;
- no request-body logging for future upload routes.

The application does not need environment variables at runtime.
