const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, 'public');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }

  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = path.resolve(root, '.' + requested);

  // Impede sair da pasta public/ via ../ ou caminhos absolutos.
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.setHeader('Content-Type', CONTENT_TYPES[path.extname(file)] || 'application/octet-stream');
    // Servidor local de desenvolvimento/atualizacao: nunca cachear, para que
    // uma nova build nao fique presa atras de um asset antigo no navegador.
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  });
});

server.on('error', e => {
  console.error('Nao foi possivel iniciar:', e.message);
  process.exitCode = 1;
});

server.listen(3217, '127.0.0.1', () => {
  const url = 'http://127.0.0.1:3217';
  console.log('Jogo: ' + url + ' | Ctrl+C para fechar');
  if (process.argv.includes('--open') && process.platform === 'win32') {
    require('node:child_process').spawn('cmd', ['/c', 'start', '', url]);
  }
});
