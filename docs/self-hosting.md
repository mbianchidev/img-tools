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

Use Node.js **26.12.1**, pinned in `.nvmrc`, and npm for local builds. With nvm
installed, run `nvm install` and `nvm use` from the repository root. CI and GitHub
Pages read `.nvmrc`; the Docker build uses the matching Node.js image. The minimum
supported Node.js version remains **22.22.2**.

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

Deployment status polling uses a one-second initial interval, with the deployment
action's existing backoff and jitter. This shortens the initial status-check wait,
not the server-side publishing time, and can make a few more status requests.
Deployments keep their non-cancelling queue and `github-pages` environment
restrictions.

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
