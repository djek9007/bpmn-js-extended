import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const dataRoot = path.resolve(process.env.DATA_DIR || '/data');
const configRoot = path.join(dataRoot, 'config');
const diagramsRoot = path.join(dataRoot, 'diagrams');

async function ensureDataDir() {
  try {
    await Promise.all([
      fs.mkdir(dataRoot, { recursive: true }),
      fs.mkdir(configRoot, { recursive: true }),
      fs.mkdir(diagramsRoot, { recursive: true })
    ]);
  } catch (error) {
    console.error('Failed to create data directory', error);
    process.exit(1);
  }
}

function resolveStoragePath(requestedPath = '') {
  const normalized = requestedPath.replace(/\\/g, '/');
  const safePath = normalized.split('/').filter(Boolean).join('/');
  const absolute = path.resolve(diagramsRoot, safePath);

  const relative = path.relative(diagramsRoot, absolute);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid path');
  }

  return absolute;
}

async function buildTree(relativePath = '') {
  const absolute = resolveStoragePath(relativePath);
  const entries = await fs.readdir(absolute, { withFileTypes: true });

  const children = await Promise.all(entries.map(async (entry) => {
    const entryRelativePath = path.posix.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      return {
        type: 'directory',
        name: entry.name,
        path: entryRelativePath,
        children: await buildTree(entryRelativePath)
      };
    }

    if (entry.isFile()) {
      return {
        type: 'file',
        name: entry.name,
        path: entryRelativePath
      };
    }

    return null;
  }));

  const filtered = children.filter(Boolean);

  filtered.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }

    return a.type === 'directory' ? -1 : 1;
  });

  return filtered;
}

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

app.get('/ui-config.json', async (req, res, next) => {
  const configPath = path.join(configRoot, 'ui-config.json');

  try {
    const stats = await fs.stat(configPath);

    if (stats.isFile()) {
      const contents = await fs.readFile(configPath, 'utf-8');
      res.type('application/json').send(contents);
      return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Failed to read custom UI config, falling back to defaults.', error);
    }
  }

  next();
});

app.use('/config', express.static(configRoot));

app.get('/api/storage/tree', async (req, res) => {
  const { path: relativePath = '' } = req.query;

  try {
    const absolute = resolveStoragePath(relativePath);
    const stats = await fs.stat(absolute);

    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path must be a directory' });
    }

    const children = await buildTree(relativePath);

    res.json({
      type: 'directory',
      name: path.basename(relativePath) || '',
      path: relativePath,
      children
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/storage/file', async (req, res) => {
  const { path: relativePath } = req.query;

  if (!relativePath) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  try {
    const absolute = resolveStoragePath(relativePath);
    const stats = await fs.stat(absolute);

    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path must point to a file' });
    }

    const contents = await fs.readFile(absolute, 'utf-8');

    res.json({ path: relativePath, contents });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/storage/file', async (req, res) => {
  const { path: relativePath, contents } = req.body;

  if (!relativePath || typeof contents !== 'string') {
    return res.status(400).json({ error: 'Path and contents are required' });
  }

  try {
    const absolute = resolveStoragePath(relativePath);
    const directory = path.dirname(absolute);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(absolute, contents, 'utf-8');

    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/storage/file', async (req, res) => {
  const { path: relativePath } = req.query;

  if (!relativePath) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  try {
    const absolute = resolveStoragePath(relativePath);

    // Guard: '/' and '.' resolve to the storage root, wiping everything below it.
    if (absolute === diagramsRoot) {
      return res.status(400).json({ error: 'Cannot delete the storage root' });
    }

    const stats = await fs.stat(absolute);

    if (stats.isDirectory()) {
      await fs.rm(absolute, { recursive: true });
    } else {
      await fs.unlink(absolute);
    }

    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/storage/rename', async (req, res) => {
  const { path: sourcePath, newPath } = req.body;

  if (!sourcePath || !newPath) {
    return res.status(400).json({ error: 'Source path and new path are required' });
  }

  try {
    const sourceAbsolute = resolveStoragePath(sourcePath);
    const targetAbsolute = resolveStoragePath(newPath);
    const stats = await fs.stat(sourceAbsolute);

    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path must point to a file' });
    }

    await fs.mkdir(path.dirname(targetAbsolute), { recursive: true });
    await fs.rename(sourceAbsolute, targetAbsolute);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/storage/directory', async (req, res) => {
  const { path: relativePath } = req.body;

  if (!relativePath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  try {
    const absolute = resolveStoragePath(relativePath);
    await fs.mkdir(absolute, { recursive: true });
    res.status(201).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const distPath = path.resolve(__dirname, '../dist');

app.use(express.static(distPath, {
  index: false
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.get('/viewer', (req, res) => {
  res.sendFile(path.join(distPath, 'viewer.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

await ensureDataDir();

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Using storage directory: ${diagramsRoot}`);
  console.log(`Using config directory: ${configRoot}`);
});
