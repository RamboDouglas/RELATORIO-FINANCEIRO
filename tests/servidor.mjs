// ============================================================
// SERVIDOR ESTÁTICO MÍNIMO
//
// Service worker, manifest e Web Crypto exigem uma origem servida
// por HTTP — abrindo o arquivo direto (file://) eles não funcionam.
// Usado pelos testes de interface e por `npm run serve`.
// ============================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TIPOS = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
    '.csv': 'text/csv; charset=utf-8',
};

export function criarServidor() {
    return http.createServer((req, res) => {
        const caminhoUrl = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        const relativo = caminhoUrl === '/' ? 'index.html' : caminhoUrl.replace(/^\/+/, '');
        const arquivo = path.join(RAIZ, relativo);

        // Impede sair da raiz do projeto por caminhos como ../../etc/passwd
        if (!arquivo.startsWith(RAIZ)) {
            res.writeHead(403).end('Fora da raiz do projeto');
            return;
        }
        fs.readFile(arquivo, (erro, conteudo) => {
            if (erro) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
                return;
            }
            res.writeHead(200, {
                'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream',
                'Cache-Control': 'no-store',
                'Service-Worker-Allowed': '/',
            });
            res.end(conteudo);
        });
    });
}

export function ouvir(porta = 0) {
    return new Promise((resolve) => {
        const servidor = criarServidor();
        servidor.listen(porta, '127.0.0.1', () => {
            resolve({ servidor, url: `http://127.0.0.1:${servidor.address().port}` });
        });
    });
}

// Execução direta: npm run serve
if (process.argv[1] && process.argv[1].endsWith('servidor.mjs')) {
    const { url } = await ouvir(8080);
    console.log(`Servindo o painel em ${url}`);
}
