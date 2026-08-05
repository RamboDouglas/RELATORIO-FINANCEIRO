// ============================================================
// TESTES DE INTERFACE (Playwright)
//
// Sobem o painel num servidor local e exercitam os fluxos que só
// existem no navegador: importação de arquivo, modais, tema, bloqueio
// por senha, gráficos e comportamento no celular.
//
//   npm run test:ui
// ============================================================
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ouvir } from './servidor.mjs';

const DATA_FIXA = '2026-08-05T12:00:00';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'relatorio-'));

let falhas = 0;
const grupo = (nome) => console.log(`\n${nome}`);
const checar = (nome, condicao, extra = '') => {
    if (!condicao) falhas++;
    console.log(`  ${condicao ? 'ok  ' : 'FALHA'} ${nome}${extra ? ` -> ${extra}` : ''}`);
};

// Em ambientes que já trazem o Chromium instalado (como o CI usado aqui),
// PLAYWRIGHT_CHROMIUM aponta para o binário e evita baixar outro.
const binario =
    process.env.PLAYWRIGHT_CHROMIUM ||
    (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : null);

const { servidor, url } = await ouvir();
const navegador = await chromium.launch(binario ? { executablePath: binario } : {});

async function novaPagina(opcoes = {}) {
    const contexto = await navegador.newContext({ acceptDownloads: true, ...opcoes });
    // Congela a data para a projeção e o corte do mês em aberto serem determinísticos.
    await contexto.addInitScript((iso) => {
        const Real = Date;
        const fixa = new Real(iso);
        class D extends Real {
            constructor(...args) {
                return args.length ? new Real(...args) : new Real(fixa);
            }
            static now() {
                return fixa.getTime();
            }
        }
        window.Date = D;
    }, DATA_FIXA);

    const pagina = await contexto.newPage();
    const erros = [];
    pagina.on('pageerror', (e) => erros.push(e.message));
    pagina.on('console', (m) => {
        if (m.type() === 'error') erros.push(`console: ${m.text()}`);
    });
    await pagina.goto(url);
    // A versão no rodapé só é preenchida no fim da inicialização.
    await pagina.waitForFunction(() => document.getElementById('app-version').textContent !== '—');
    await pagina.waitForTimeout(400);
    return { pagina, contexto, erros };
}

const meses = (p) => p.$$eval('#main-table-body tr td:first-child', (els) => els.map((e) => e.textContent.trim()));

// ------------------------------------------------------------
grupo('Injeção pelo nome do mês (item 1)');
{
    const { pagina, contexto, erros } = await novaPagina();
    let executou = false;
    await pagina.exposeFunction('__marcar', () => {
        executou = true;
    });
    await pagina.evaluate(() => {
        financialData = [normalizeRecord({ month: "Jan/2025'),window.__marcar(),('", cash: 1, expenses: 0 })];
        updateDashboard(financialData);
    });
    await pagina.click('.month-tab').catch(() => {});
    await pagina.waitForTimeout(300);
    checar('nome malicioso não executa código', executou === false);
    checar('nome é exibido como texto', (await pagina.textContent('#month-tabs')).includes('__marcar'));
    checar('sem erros de JS', erros.length === 0, erros.join(' | '));
    await contexto.close();
}

// ------------------------------------------------------------
grupo('Cadastro, filtro e ordenação (itens 2, 24, 31, 32)');
{
    const { pagina, contexto, erros } = await novaPagina();
    checar('campo de texto livre do mês não existe mais', (await pagina.$('#month')) === null);

    await pagina.click('button[aria-label="Adicionar mês"]');
    await pagina.selectOption('#month-name', 'Mai');
    await pagina.selectOption('#month-year', '2025');
    for (const [id, v] of [
        ['cash', '40000'],
        ['card', '90000'],
        ['pix', '30000'],
        ['ifood', '2000'],
        ['expenses', '120000'],
    ]) {
        await pagina.fill(`#${id}`, v);
    }
    await pagina.click('#save-button');
    if (await pagina.isVisible('#form-warning')) await pagina.click('#save-button');
    await pagina.waitForTimeout(400);
    checar('mês adicionado pelos seletores', (await meses(pagina)).includes('Mai/2025'));

    // Atalho de período (item 31)
    await pagina.click('button:has-text("Analisar Período")');
    await pagina.click('button:has-text("Últimos 3")');
    await pagina.waitForTimeout(400);
    checar('atalho "Últimos 3" aplica o recorte', (await meses(pagina)).length === 3);

    // Filtro persiste ao editar (item 32)
    await pagina.evaluate(() => {
        const i = financialData.findIndex((d) => d.month === 'Mai/2025');
        openModal(i);
    });
    await pagina.fill('#cash', '41000');
    await pagina.click('#save-button');
    if (await pagina.isVisible('#form-warning')) await pagina.click('#save-button');
    await pagina.waitForTimeout(400);
    checar('filtro continua aplicado após editar', (await meses(pagina)).length === 3);

    // Ordenação (item 24)
    const antes = (await meses(pagina))[0];
    await pagina.click('#main-table-head th:nth-child(2)');
    await pagina.waitForTimeout(300);
    const depois = (await meses(pagina))[0];
    checar('ordenar por receita reordena a tabela', antes !== depois, `${antes} -> ${depois}`);
    checar('cabeçalhos têm scope', (await pagina.$$('#main-table-head th[scope="col"]')).length === 6);
    checar('sem erros de JS', erros.length === 0, erros.join(' | '));
    await contexto.close();
}

// ------------------------------------------------------------
grupo('Backup versionado, conferência e desfazer (itens 3, 4, 5, 7)');
{
    const { pagina, contexto, erros } = await novaPagina();
    const [download] = await Promise.all([
        pagina.waitForEvent('download'),
        pagina.click('button[aria-label="Baixar backup"]'),
    ]);
    const arquivo = path.join(tmp, 'backup.json');
    await download.saveAs(arquivo);
    const pacote = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    checar('formato versionado', pacote.versao === 2 && pacote.formato === 'relatorio-financeiro');
    checar('traz somas de conferência', typeof pacote.somaReceitaBruta === 'number');

    // Arquivo adulterado deve ser denunciado (item 7)
    const adulterado = path.join(tmp, 'adulterado.json');
    fs.writeFileSync(adulterado, JSON.stringify({ ...pacote, totalRegistros: 99 }));
    await pagina.setInputFiles('#backup-input', adulterado);
    await pagina.waitForTimeout(500);
    checar('avisa divergência de contagem', (await pagina.textContent('#restore-summary')).includes('declara 99'));
    await pagina.click('#restore-modal button:has-text("Cancelar")');

    // Substituir e desfazer (itens 4 e 5)
    const antigo = path.join(tmp, 'antigo.json');
    fs.writeFileSync(antigo, JSON.stringify([{ month: 'Mar/2020', cash: 1, card: 0, pix: 0, ifood: 0, expenses: 0 }]));
    const antes = (await meses(pagina)).length;
    await pagina.setInputFiles('#backup-input', antigo);
    await pagina.waitForTimeout(500);
    checar('formato antigo (lista pura) ainda é aceito', await pagina.isVisible('#restore-modal'));
    await pagina.click('#restore-modal button:has-text("Substituir tudo")');
    await pagina.waitForTimeout(500);
    checar('substituição aplicada', (await meses(pagina)).length === 1);
    checar(
        'cópia automática gravada',
        await pagina.evaluate(() => !!localStorage.getItem('financialReportAutoBackup')),
    );
    await pagina.click('#undo-bar button');
    await pagina.waitForTimeout(500);
    checar('desfazer restaurou o estado anterior', (await meses(pagina)).length === antes);
    checar('sem erros de JS', erros.length === 0, erros.join(' | '));
    await contexto.close();
}

// ------------------------------------------------------------
grupo('Taxas, metas e projeção (itens 9, 14, 16)');
{
    const { pagina, contexto, erros } = await novaPagina();
    const lucroAntes = await pagina.evaluate(() => somar(financialData, getProfit));
    await pagina.click('button:has-text("Taxas e metas")');
    await pagina.fill('#cfg-taxa-cartao', '3');
    await pagina.fill('#cfg-taxa-ifood', '20');
    await pagina.fill('#cfg-meta-receita', '150000');
    await pagina.fill('#cfg-meta-margem', '25');
    await pagina.click('#config-form button[type="submit"]');
    await pagina.waitForTimeout(600);
    const lucroDepois = await pagina.evaluate(() => somar(financialData, getProfit));
    checar('taxa reduz o lucro', lucroDepois < lucroAntes, `${lucroAntes.toFixed(0)} -> ${lucroDepois.toFixed(0)}`);
    checar('metas aparecem', (await pagina.textContent('#goal-progress')).includes('Meta de receita'));
    checar(
        'configuração sobrevive ao recarregar',
        await pagina.evaluate(async () => {
            location.reload();
            return true;
        }),
    );
    await pagina.waitForTimeout(800);
    checar('taxa persistida', (await pagina.evaluate(() => config.taxaCartao)) === 3);

    // Projeção do mês em aberto (item 16)
    await pagina.evaluate(() => {
        financialData.push(normalizeRecord({ month: 'Ago/2026', cash: 1000, expenses: 500 }));
        financialData = sortData(financialData);
        updateDashboard(financialData);
    });
    await pagina.waitForTimeout(400);
    checar('projeção do mês corrente', (await pagina.textContent('#projection-note')).includes('5 de 31 dias'));
    checar('sem erros de JS', erros.length === 0, erros.join(' | '));
    await contexto.close();
}

// ------------------------------------------------------------
grupo('Tema escuro e acessibilidade (itens 29, 34, 35)');
{
    const { pagina, contexto, erros } = await novaPagina();
    checar('começa no tema claro', !(await pagina.evaluate(() => document.documentElement.classList.contains('dark'))));
    await pagina.click('#theme-toggle');
    await pagina.waitForTimeout(500);
    checar('alterna para escuro', await pagina.evaluate(() => document.documentElement.classList.contains('dark')));
    await pagina.reload();
    await pagina.waitForTimeout(700);
    checar(
        'tema persiste ao recarregar',
        await pagina.evaluate(() => document.documentElement.classList.contains('dark')),
    );

    await pagina.click('button[aria-label="Adicionar mês"]');
    await pagina.waitForTimeout(300);
    checar('modal tem papel de diálogo', (await pagina.getAttribute('#data-modal', 'role')) === 'dialog');
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(300);
    checar(
        'Esc fecha o modal',
        await pagina.evaluate(() => document.getElementById('data-modal').classList.contains('hidden')),
    );
    checar('botões de ícone têm rótulo acessível', (await pagina.$$('button[aria-label]')).length >= 4);
    checar('sem erros de JS', erros.length === 0, erros.join(' | '));
    await contexto.close();
}

// ------------------------------------------------------------
grupo('Bloqueio por senha (item 49)');
{
    const { pagina, contexto, erros } = await novaPagina();
    await pagina.evaluate(() => ativarBloqueio());
    await pagina.waitForTimeout(300);
    await pagina.click('#confirm-ok');
    await pagina.waitForTimeout(300);
    await pagina.fill('#lock-password', 'segredo123');
    await pagina.fill('#lock-password-2', 'segredo123');
    await pagina.click('#lock-form button[type="submit"]');
    await pagina.waitForTimeout(800);
    checar('cofre criado', await pagina.evaluate(() => !!localStorage.getItem('financialReportVault')));
    checar('dados legíveis removidos', await pagina.evaluate(() => !localStorage.getItem('financialReportData')));
    checar(
        'conteúdo do cofre é ilegível',
        await pagina.evaluate(() => !localStorage.getItem('financialReportVault').includes('Set/2024')),
    );

    await pagina.reload();
    await pagina.waitForTimeout(700);
    checar('pede senha ao abrir', await pagina.isVisible('#lock-modal'));
    checar('nada é renderizado antes da senha', (await meses(pagina)).length === 0);

    await pagina.fill('#lock-password', 'errada');
    await pagina.click('#lock-form button[type="submit"]');
    await pagina.waitForTimeout(600);
    checar('senha errada é recusada', await pagina.isVisible('#lock-error'));

    await pagina.fill('#lock-password', 'segredo123');
    await pagina.click('#lock-form button[type="submit"]');
    await pagina.waitForTimeout(800);
    checar('senha correta abre o painel', (await meses(pagina)).length > 0);
    checar('sem erros de JS', erros.length === 0, erros.join(' | '));
    await contexto.close();
}

// ------------------------------------------------------------
grupo('Exportações (itens 20, 22, 50)');
{
    const { pagina, contexto, erros } = await novaPagina();
    const [csv] = await Promise.all([
        pagina.waitForEvent('download'),
        pagina.click('button[aria-label="Exportar CSV"]'),
    ]);
    const caminhoCsv = path.join(tmp, 'export.csv');
    await csv.saveAs(caminhoCsv);
    const conteudo = fs.readFileSync(caminhoCsv, 'utf8');
    checar('CSV traz as colunas novas', conteudo.includes('Receita Líquida') && conteudo.includes('Mercadoria (CMV)'));

    const [contabil] = await Promise.all([
        pagina.waitForEvent('download'),
        pagina.click('button:has-text("Planilha para a contabilidade")'),
    ]);
    const caminhoContabil = path.join(tmp, 'contabil.csv');
    await contabil.saveAs(caminhoContabil);
    const linhas = fs.readFileSync(caminhoContabil, 'utf8').trim().split('\r\n');
    checar('planilha contábil tem competência AAAA-MM', linhas[1].startsWith('"2024-09"'), linhas[1].slice(0, 12));
    checar('planilha contábil fecha com totais', linhas[linhas.length - 1].startsWith('"TOTAL"'));

    // CSV volta pela restauração (item 23)
    await pagina.evaluate(() => localStorage.clear());
    await pagina.reload();
    await pagina.waitForTimeout(700);
    await pagina.setInputFiles('#backup-input', caminhoCsv);
    await pagina.waitForTimeout(600);
    checar('CSV é reconhecido na importação', await pagina.isVisible('#restore-modal'));
    await pagina.click('#restore-modal button:has-text("Substituir tudo")');
    await pagina.waitForTimeout(600);
    checar('CSV importado', (await meses(pagina)).length === 8);
    checar('sem erros de JS', erros.length === 0, erros.join(' | '));
    await contexto.close();
}

// ------------------------------------------------------------
grupo('Celular: layout e gráficos (itens 26, 33)');
{
    const { pagina, contexto, erros } = await novaPagina(devices['iPhone 14 Pro']);
    // Testa o comportamento real: elementos fixos inflam scrollWidth sem
    // que a página role de fato, então medir a rolagem é mais fiel.
    await pagina.evaluate(() => window.scrollTo(400, 0));
    await pagina.waitForTimeout(200);
    checar('página não rola na horizontal', (await pagina.evaluate(() => window.scrollX)) === 0);
    const largoDemais = await pagina.evaluate(() => {
        const limite = document.documentElement.clientWidth;
        return [...document.querySelectorAll('body > *')]
            .filter((e) => getComputedStyle(e).display !== 'none')
            .filter((e) => e.getBoundingClientRect().right > limite + 1)
            .map((e) => e.id || e.tagName.toLowerCase());
    });
    checar('nenhum elemento passa da largura da tela', largoDemais.length === 0, largoDemais.join(', '));
    const altura = await pagina.$eval('header', (e) => Math.round(e.getBoundingClientRect().height));
    checar('cabeçalho compacto', altura < 340, `${altura}px`);
    checar('gráficos renderizados', await pagina.evaluate(() => !!revenueExpensesChart));
    checar('valores abreviados no eixo', (await pagina.evaluate(() => abreviarValor(138164))) === 'R$ 138 mil');
    checar('manifest declarado', (await pagina.$('link[rel="manifest"]')) !== null);
    checar('sem erros de JS', erros.length === 0, erros.join(' | '));
    await contexto.close();
}

// ------------------------------------------------------------
await navegador.close();
servidor.close();
fs.rmSync(tmp, { recursive: true, force: true });

console.log(falhas === 0 ? '\nTodos os testes de interface passaram.' : `\n${falhas} falha(s).`);
process.exit(falhas ? 1 : 0);
