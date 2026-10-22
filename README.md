# BPMN Modeler & Viewer

This project delivers a BPMN.io powered modeler and viewer packaged in a Docker image. The modeler mirrors the [bpmn.io demo](https://demo.bpmn.io/new) experience, provides a property sidebar, and integrates with a persistent storage volume that supports nested folder structures.

## Features

- **Full BPMN modeling experience** with the BPMN.io modeler and properties panel.
- **Tree-based storage browser** to load and save diagrams from a mounted Docker volume.
- **Viewer-only page** that renders diagrams without additional UI, ideal for embedding.
- **REST API** for listing, reading, and writing BPMN diagrams inside the workspace volume.

## UI customization

The client reads `/ui-config.json` on startup so you can adjust branding without rebuilding the project. When the server finds a
`ui-config.json` file inside the runtime configuration directory (`$DATA_DIR/config/ui-config.json`) it will serve that file
instead of the bundled defaults.

To customise the UI in Docker, mount a folder that contains your configuration (and any referenced assets) into `/data/config`:

```bash
docker run \
  -it --rm \
  -p 3000:3000 \
  -v $(pwd)/branding/ui-config.json:/data/config/ui-config.json:ro \
  -v $(pwd)/branding/assets:/data/config/assets:ro \
  bpmn-js-extended
```

Assets placed in the configuration directory are exposed under `/config/...`, making it easy to reference custom logos or
favicons without hosting them elsewhere. The bundled defaults remain available for quick starts.

Supported options include:

- **Application titles** – change the browser tab titles for the modeler and viewer.
- **Favicon** – point to any icon that is served by the web server.
- **Header logo** – provide an image, optional link, and optional dimensions.
- **Theme colours** – override any CSS custom property for the light or dark theme.

Example configuration:

```json
{
  "titles": { "modeler": "Acme BPMN", "viewer": "Acme Viewer" },
  "favicon": "/config/assets/acme-favicon.svg",
  "headerLogo": {
    "src": "/config/assets/acme-logo.svg",
    "alt": "Acme BPMN Suite",
    "href": "https://acme.example.com",
    "newTab": true,
    "height": "32px"
  },
  "colors": {
    "light": {
      "--button-primary-start": "#0ea5e9",
      "--button-primary-end": "#6366f1"
    },
    "dark": {
      "--surface": "rgba(15, 23, 42, 0.92)"
    }
  }
}
```

## Getting Started

### Quick start (any machine with Docker)

```bash
git clone https://github.com/djek9007/bpmn-js-extended.git
cd bpmn-js-extended
docker compose up -d --build
```

Open [http://localhost:3000](http://localhost:3000). Nothing else needs to be installed — the image
contains Node and the built client, and diagrams are stored as plain files in `./data` on the host.

Stop with `docker compose down`. To upgrade: `git pull && docker compose up -d --build`.

### Local development (Node.js 20+)

```bash
npm install
npm run build
npm start
```

The server listens on [http://localhost:3000](http://localhost:3000).

Both flows use the same `./data` folder, created automatically:

- `data/diagrams/` – BPMN diagrams. Paths used by the UI and API are relative to this folder.
- `data/config/` – optional `ui-config.json` and assets.

Point `DATA_DIR` somewhere else if you prefer (`DATA_DIR=/path/to/storage npm start`, or change the
volume in `docker-compose.yml`). On Linux the container writes as root, so files created through
Docker may belong to `root`; `sudo chown -R "$UID:$GID" data` fixes ownership if `npm start` cannot
write them.

> `data/` is git-ignored on purpose. Diagrams are your own content — copy the folder to another
> machine instead of committing it.

### Docker image by hand

```bash
docker build -t bpmn-js-extended .
docker run -it --rm -p 3000:3000 -v "$(pwd)/data:/data" bpmn-js-extended
```

Without `-v`, Docker creates an anonymous volume for `/data` and your diagrams end up somewhere
under `/var/lib/docker` — always pass the mount.

- Visit `http://localhost:3000/` for the modeler.
- Visit `http://localhost:3000/viewer?path=example.bpmn` for the viewer (adjust the `path` parameter to the stored file).

### API endpoints

- `GET /api/storage/tree?path=<relative-folder>` – list files and folders recursively.
- `GET /api/storage/file?path=<file>` – fetch a BPMN diagram.
- `POST /api/storage/file` – save a BPMN diagram (`{ path, contents }`).
- `POST /api/storage/directory` – create a folder (`{ path }`).

## Volume layout

All read and write operations are scoped to `DATA_DIR` (`/data` inside the Docker image, `./data` for a local `npm start`). The server manages two subdirectories:

- `config/` – optional runtime configuration and assets (e.g. `ui-config.json`, `assets/logo.svg`).
- `diagrams/` – BPMN diagrams created via the modeler (nested folders supported, e.g. `order/process.bpmn`).

Paths used by the API and UI are always relative to the `diagrams/` folder.

> **Note:** If you are upgrading from a version that stored BPMN files directly in `$DATA_DIR`, move those files into `$DATA_DIR/diagrams` so they appear in the storage browser and API responses.

## FAQ

### Are BPMN models saved automatically?

Diagrams are **not** saved automatically. The modeler keeps the current diagram in memory and only persists it when you explicitly trigger the save flow. Use the storage sidebar form and enter a file path to store the diagram, which calls the `/api/storage/file` endpoint with the current XML contents produced by `modeler.saveXML`.

## License

This project is provided under the MIT License.
