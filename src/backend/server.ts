import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import serveIndex from 'serve-index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;
const ROOT = path.join(__dirname, '../');

app.use((_, res, next) => {
  res.append('Cross-Origin-Opener-Policy', 'same-origin');
  res.append('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use(express.static(ROOT));
app.use('/', serveIndex(ROOT, { icons: true }));

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});