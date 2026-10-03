import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const CONFIG_FILE = path.join(DATA_DIR, 'site-config.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded assets
app.use('/uploads', express.static(UPLOADS_DIR));

// 1. API: Get persistent site config (shared across all devices)
app.get('/api/site-config', (req, res) => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      if (content && content.trim() && content.trim() !== '{}') {
        return res.json(JSON.parse(content));
      }
    }
    const srcPersisted = path.join(__dirname, 'src', 'data', 'persistedSiteConfig.json');
    if (fs.existsSync(srcPersisted)) {
      const content = fs.readFileSync(srcPersisted, 'utf-8');
      if (content && content.trim() && content.trim() !== '{}') {
        const parsed = JSON.parse(content);
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        return res.json(parsed);
      }
    }
  } catch (e) {
    console.error('Error reading site config:', e);
  }
  return res.json(null);
});

// 2. API: Save persistent site config (shared across all devices)
app.post('/api/site-config', (req, res) => {
  try {
    const config = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Configuration invalide' });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    const srcPersisted = path.join(__dirname, 'src', 'data', 'persistedSiteConfig.json');
    fs.writeFileSync(srcPersisted, JSON.stringify(config, null, 2), 'utf-8');
    return res.json({ success: true, config });
  } catch (err: any) {
    console.error('Error saving site config:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. API: Get persistent products
app.get('/api/products', (req, res) => {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const content = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
      if (content && content.trim()) {
        return res.json(JSON.parse(content));
      }
    }
  } catch (e) {
    console.error('Error reading products:', e);
  }
  return res.json(null);
});

// 4. API: Save persistent products
app.post('/api/products', (req, res) => {
  try {
    const prods = req.body;
    if (!Array.isArray(prods)) {
      return res.status(400).json({ error: 'Liste de produits invalide' });
    }
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(prods, null, 2), 'utf-8');
    return res.json({ success: true, count: prods.length });
  } catch (err: any) {
    console.error('Error saving products:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 4b. API: Get persistent categories
app.get('/api/categories', (req, res) => {
  try {
    if (fs.existsSync(CATEGORIES_FILE)) {
      const content = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
      if (content && content.trim()) {
        return res.json(JSON.parse(content));
      }
    }
  } catch (e) {
    console.error('Error reading categories:', e);
  }
  return res.json(null);
});

// 4c. API: Save persistent categories
app.post('/api/categories', (req, res) => {
  try {
    const cats = req.body;
    if (!Array.isArray(cats)) {
      return res.status(400).json({ error: 'Liste de catégories invalide' });
    }
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(cats, null, 2), 'utf-8');
    return res.json({ success: true, count: cats.length });
  } catch (err: any) {
    console.error('Error saving categories:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. API: Image upload (handles base64 data URLs)
app.post('/api/upload', (req, res) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image requise' });
    }
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      // If it's already a URL, return it
      return res.json({ url: imageBase64 });
    }
    let ext = (matches[1].split('/')[1] || 'png').toLowerCase().replace('+xml', '');
    if (ext === 'jpeg') ext = 'jpg';
    const safeName = (filename ? filename.replace(/[^a-zA-Z0-9_-]/g, '_') : 'img') + '-' + Date.now() + '.' + ext;
    const filePath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
    return res.json({ url: `/uploads/${safeName}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gomarche server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
