# Contributing

Contributions are welcome.

## Before starting

- Search existing issues and pull requests.
- Open an issue before a large behavior or architecture change.
- Keep image processing local unless the project explicitly changes its privacy
  model.
- Use synthetic fixtures in tests. Never add personal or customer images.

## Development

Use the Node.js version pinned in `.nvmrc` to match CI. See the
[local build requirements](docs/self-hosting.md#static-hosting) for setup.

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run check
docker compose build --no-cache
```

CI runs the `test` and `container` checks on pull requests, including drafts, and
pushes to `main`. New commits cancel obsolete CI runs for the same pull request;
`main` runs remain independent. The container check uses the runner's bundled
Docker builder without a layer cache. Pages deployments keep their separate
non-cancelling queue.

## Pull requests

- Keep each pull request focused.
- Explain the user-visible change and any browser limitations.
- Add behavior-focused tests for new controls and pure image helpers.
- Update README or `docs/` when setup, usage, or architecture changes.
- Include screenshots for visual changes.

By contributing, you agree that your contribution is licensed under the MIT
License.
