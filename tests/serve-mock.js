import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockDir = path.join(__dirname, 'mock-chat');

const routes = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/claude': 'claude.html',
  '/claude.html': 'claude.html',
  '/gemini': 'gemini.html',
  '/gemini.html': 'gemini.html',
  '/generic-ai': 'index.html',
  '/copilot': 'index.html',
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const fileName = routes[urlPath] || 'index.html';
  const htmlPath = path.join(mockDir, fileName);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(htmlPath));
});

server.listen(3000, () => {
  console.log('\n--- Mock Chat Server Ready ---');
  console.log('ChatGPT mock: http://localhost:3000');
  console.log('Claude mock:  http://localhost:3000/claude');
  console.log('Gemini mock:  http://localhost:3000/gemini\n');
});
