import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const distDir = path.join(__dirname, 'dist');

// Health check endpoint for Cloud Run
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

// Serve static assets from Vite dist build
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, {
    maxAge: '1d',
    index: false,
  }));
}

// SPA fallback to index.html for all client routes
app.get('*', (_req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application build not found.');
  }
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`ST Production & Stock Manager server running on http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const fallbackPort = PORT === 8080 ? 3000 : 8080;
    console.warn(`Port ${PORT} in use, attempting fallback port ${fallbackPort}...`);
    app.listen(fallbackPort, '0.0.0.0', () => {
      console.log(`ST Production & Stock Manager server running on http://0.0.0.0:${fallbackPort}`);
    });
  } else {
    console.error('Server error:', err);
  }
});

// Graceful container termination
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
