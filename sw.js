/* ============================================================
 * SERVICE WORKER
 *
 * Guarda o painel inteiro no aparelho na primeira visita. Depois
 * disso ele abre sem internet — o que importa numa loja, onde a
 * conexão cai e os dados ficam no próprio aparelho de qualquer forma.
 *
 * Estratégia: cache primeiro para os arquivos do app (são versionados
 * junto com o CACHE_NOME, então uma versão nova invalida a anterior),
 * e rede primeiro para o resto.
 * ============================================================ */

const CACHE_NOME = 'relatorio-financeiro-v1.0.0';

const ARQUIVOS = [
    './',
    './index.html',
    './css/tailwind.css',
    './css/styles.css',
    './js/core.js',
    './js/app.js',
    './vendor/chart.umd.js',
    './vendor/chartjs-plugin-datalabels.min.js',
    './vendor/jspdf.umd.min.js',
    './vendor/html2canvas.min.js',
    './vendor/fontawesome/css/all.min.css',
    './vendor/fontawesome/webfonts/fa-solid-900.woff2',
    './vendor/fontawesome/webfonts/fa-regular-400.woff2',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (evento) => {
    evento.waitUntil(
        caches.open(CACHE_NOME)
            // addAll falha inteiro se um arquivo faltar; individual é mais tolerante.
            .then((cache) => Promise.allSettled(ARQUIVOS.map((a) => cache.add(a))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (evento) => {
    evento.waitUntil(
        caches.keys()
            .then((nomes) => Promise.all(
                nomes.filter((n) => n !== CACHE_NOME).map((n) => caches.delete(n))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (evento) => {
    const requisicao = evento.request;
    if (requisicao.method !== 'GET') return;

    const url = new URL(requisicao.url);
    if (url.origin !== self.location.origin) return;

    evento.respondWith(
        caches.match(requisicao).then((emCache) => {
            if (emCache) {
                // Atualiza em segundo plano para a próxima abertura.
                fetch(requisicao)
                    .then((resposta) => {
                        if (resposta && resposta.ok) {
                            caches.open(CACHE_NOME).then((c) => c.put(requisicao, resposta));
                        }
                    })
                    .catch(() => { /* offline: o cache já respondeu */ });
                return emCache;
            }
            return fetch(requisicao)
                .then((resposta) => {
                    if (resposta && resposta.ok) {
                        const copia = resposta.clone();
                        caches.open(CACHE_NOME).then((c) => c.put(requisicao, copia));
                    }
                    return resposta;
                })
                .catch(() => caches.match('./index.html'));
        })
    );
});
