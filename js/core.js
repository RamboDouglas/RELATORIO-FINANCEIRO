// ============================================================
// NÚCLEO DE CÁLCULO — funções puras
//
// Sem DOM e sem acesso a armazenamento: tudo entra por parâmetro e
// sai como retorno. É o que permite testar a parte onde um erro
// significa número errado para o dono da loja, sem abrir o navegador.
//
// Carrega tanto como <script> comum (expõe no escopo global, para o
// app funcionar até abrindo o arquivo direto) quanto via require()
// nos testes em Node.
// ============================================================
(function (raiz, fabrica) {
    const api = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = api;
    Object.assign(raiz, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    function escapeHtml(value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function toNumber(value) {
        if (typeof value === 'number') return isFinite(value) ? value : 0;
        if (value === null || value === undefined) return 0;
        let str = String(value)
            .trim()
            .replace(/[^\d,.-]/g, '');
        if (str.indexOf(',') !== -1) {
            str = str.replace(/\./g, '').replace(',', '.'); // 1.234,56 -> 1234.56
        } else if ((str.match(/\./g) || []).length > 1) {
            str = str.replace(/\./g, ''); // 1.234.567 só pode ser separador de milhar
        }
        const parsed = parseFloat(str);
        return isFinite(parsed) ? parsed : 0;
    }

    function normalizeRecord(item) {
        const source = item || {};
        const registro = {
            month: String(source.month === undefined || source.month === null ? '' : source.month).trim(),
            cash: toNumber(source.cash),
            card: toNumber(source.card),
            pix: toNumber(source.pix),
            ifood: toNumber(source.ifood),
            expenses: toNumber(source.expenses),
            // Parte das despesas que é compra de mercadoria (CMV).
            cmv: toNumber(source.cmv),
            // Número de vendas do mês; 0 significa "não informado".
            vendas: Math.max(0, Math.round(toNumber(source.vendas))),
            // Detalhamento das despesas por categoria, quando disponível.
            categorias: {},
            atualizadoEm: typeof source.atualizadoEm === 'string' ? source.atualizadoEm : '',
        };
        if (source.categorias && typeof source.categorias === 'object' && !Array.isArray(source.categorias)) {
            Object.keys(source.categorias).forEach((nome) => {
                const valor = toNumber(source.categorias[nome]);
                if (valor > 0) registro.categorias[String(nome).trim().toLowerCase()] = valor;
            });
        }
        // O CMV nunca pode passar da despesa total do mês.
        if (registro.cmv > registro.expenses) registro.cmv = registro.expenses;
        return registro;
    }

    function marcarAtualizacao(registro) {
        return { ...registro, atualizadoEm: new Date().toISOString() };
    }

    const CONFIG_PADRAO = { taxaCartao: 0, taxaIfood: 0, metaReceita: 0, metaMargem: 0 };

    const MONTH_MAP = {
        jan: 1,
        fev: 2,
        mar: 3,
        abr: 4,
        mai: 5,
        maio: 5,
        jun: 6,
        jul: 7,
        ago: 8,
        set: 9,
        out: 10,
        nov: 11,
        dez: 12,
    };

    function monthSortKey(monthStr) {
        const parts = String(monthStr || '')
            .trim()
            .split('/');
        const name = (parts[0] || '').trim().toLowerCase().replace(/\./g, '');
        let year = parseInt(parts[1], 10);
        const month = MONTH_MAP[name] || MONTH_MAP[name.slice(0, 3)];
        // typeof: nomes como "constructor" herdam valores do protótipo e voltariam NaN.
        if (typeof month !== 'number' || isNaN(year)) return Number.MAX_SAFE_INTEGER;
        if (year < 100) year += 2000;
        return year * 12 + month;
    }

    function sortData(data) {
        return data.slice().sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month));
    }

    const MESES_ORDEM = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    function medianaDe(valores) {
        if (valores.length === 0) return 0;
        const ordenado = [...valores].sort((a, b) => a - b);
        const meio = Math.floor(ordenado.length / 2);
        return ordenado.length % 2 ? ordenado[meio] : (ordenado[meio - 1] + ordenado[meio]) / 2;
    }

    function escapeCsv(value) {
        let str = value === null || value === undefined ? '' : String(value);
        if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
        return `"${str.replace(/"/g, '""')}"`;
    }

    function construirSumarioExecutivo(dados) {
        if (dados.length === 0) return ['Nenhum mês selecionado.'];
        const linhas = [];
        const receita = somar(dados, getGrossIncome);
        const liquida = somar(dados, getNetIncome);
        const lucro = somar(dados, getProfit);
        const margem = liquida > 0 ? (lucro / liquida) * 100 : 0;

        linhas.push(
            `Lucro de ${formatCurrency(lucro)} sobre receita de ${formatCurrency(receita)}, margem de ${margem.toFixed(1)}%.`,
        );

        const taxas = somar(dados, getFees);
        if (taxas > 0) {
            linhas.push(
                `Taxas de cartão e iFood consumiram ${formatCurrency(taxas)} no período (receita líquida de ${formatCurrency(liquida)}).`,
            );
        }

        const melhor = dados.reduce((p, c) => (getProfit(c) > getProfit(p) ? c : p));
        const pior = dados.reduce((p, c) => (getProfit(c) < getProfit(p) ? c : p));
        linhas.push(
            `Melhor mês: ${melhor.month} (${formatCurrency(getProfit(melhor))}). Pior: ${pior.month} (${formatCurrency(getProfit(pior))}).`,
        );

        if (dados.length >= 2) {
            const primeiro = getMargin(dados[0]);
            const ultimo = getMargin(dados[dados.length - 1]);
            const delta = ultimo - primeiro;
            const rumo = delta >= 0 ? 'subiu' : 'caiu';
            linhas.push(
                `A margem ${rumo} ${Math.abs(delta).toFixed(1)} ponto(s) percentual(is) entre ${dados[0].month} (${primeiro.toFixed(1)}%) e ${dados[dados.length - 1].month} (${ultimo.toFixed(1)}%).`,
            );
        }

        const prejuizo = dados.filter((d) => getProfit(d) < 0);
        if (prejuizo.length > 0) {
            linhas.push(`Operou com prejuízo em: ${prejuizo.map((d) => d.month).join(', ')}.`);
        }

        const categorias = agregarCategorias(dados);
        const nomes = Object.keys(categorias);
        if (nomes.length > 0) {
            const total = nomes.reduce((s, n) => s + categorias[n], 0);
            const top = nomes
                .sort((a, b) => categorias[b] - categorias[a])
                .slice(0, 3)
                .map((n) => `${n} ${((categorias[n] / total) * 100).toFixed(0)}%`)
                .join(', ');
            linhas.push(`Composição das despesas: ${top}.`);
        }

        const cmv = somar(dados, (d) => d.cmv);
        if (cmv > 0 && liquida > 0) {
            linhas.push(
                `Margem de contribuição de ${(((liquida - cmv) / liquida) * 100).toFixed(1)}% (mercadoria: ${formatCurrency(cmv)}).`,
            );
        }

        const totalVendas = somar(dados, (d) => d.vendas);
        if (totalVendas > 0) {
            linhas.push(
                `Ticket médio de ${formatCurrency(receita / totalVendas)} em ${totalVendas.toLocaleString('pt-BR')} vendas.`,
            );
        }

        return linhas;
    }

    function lerLinhaCsv(linha, separador) {
        const campos = [];
        let atual = '';
        let aspas = false;
        for (let i = 0; i < linha.length; i++) {
            const c = linha[i];
            if (aspas) {
                if (c === '"' && linha[i + 1] === '"') {
                    atual += '"';
                    i++;
                } else if (c === '"') aspas = false;
                else atual += c;
            } else if (c === '"') aspas = true;
            else if (c === separador) {
                campos.push(atual);
                atual = '';
            } else atual += c;
        }
        campos.push(atual);
        return campos.map((v) => v.trim().replace(/^'/, ''));
    }

    function converterCsv(texto) {
        const linhas = texto
            .replace(/^\ufeff/, '')
            .split(/\r?\n/)
            .filter((l) => l.trim() !== '');
        if (linhas.length < 2) return { registros: [], erro: 'O arquivo não tem linhas de dados.' };

        const separador = linhas[0].split(';').length > linhas[0].split(',').length ? ';' : ',';
        const cabecalho = lerLinhaCsv(linhas[0], separador).map((h) => h.toLowerCase());

        const acha = (...termos) => cabecalho.findIndex((h) => termos.some((t) => h.indexOf(t) !== -1));
        const iMes = acha('mês', 'mes');
        if (iMes === -1) return { registros: [], erro: 'Não encontrei a coluna do mês no cabeçalho.' };
        const idx = {
            cash: acha('dinheiro'),
            card: acha('cartão', 'cartao'),
            pix: acha('pix'),
            ifood: acha('ifood'),
            expenses: acha('saída', 'saida', 'despesa'),
            cmv: acha('mercadoria', 'cmv'),
            vendas: acha('nº de vendas', 'n de vendas', 'qtd'),
        };

        const registros = [];
        const ignoradas = [];
        for (let i = 1; i < linhas.length; i++) {
            const campos = lerLinhaCsv(linhas[i], separador);
            const mes = (campos[iMes] || '').trim();
            if (!mes || monthSortKey(mes) === Number.MAX_SAFE_INTEGER) {
                ignoradas.push(i + 1);
                continue;
            }
            const pegar = (chave) => (idx[chave] !== -1 && idx[chave] !== undefined ? campos[idx[chave]] : 0);
            registros.push(
                normalizeRecord({
                    month: mes,
                    cash: pegar('cash'),
                    card: pegar('card'),
                    pix: pegar('pix'),
                    ifood: pegar('ifood'),
                    expenses: pegar('expenses'),
                    cmv: pegar('cmv'),
                    vendas: pegar('vendas'),
                }),
            );
        }
        return { registros, ignoradas };
    }

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function getGrossIncome(item) {
        return item.cash + item.card + item.pix + item.ifood;
    }

    function getFees(item) {
        return item.card * (config.taxaCartao / 100) + item.ifood * (config.taxaIfood / 100);
    }

    function getNetIncome(item) {
        return getGrossIncome(item) - getFees(item);
    }

    function getProfit(item) {
        return getNetIncome(item) - item.expenses;
    }

    function getMargin(item) {
        const liquida = getNetIncome(item);
        return liquida > 0 ? (getProfit(item) / liquida) * 100 : 0;
    }

    function getContributionMargin(item) {
        const liquida = getNetIncome(item);
        if (!(item.cmv > 0) || liquida <= 0) return null;
        return ((liquida - item.cmv) / liquida) * 100;
    }

    function getTicket(item) {
        return item.vendas > 0 ? getGrossIncome(item) / item.vendas : null;
    }

    function somar(dados, fn) {
        return dados.reduce((total, item) => total + fn(item), 0);
    }

    function mediaMovel(valores, janela = 3) {
        return valores.map((_, i) => {
            const inicio = Math.max(0, i - janela + 1);
            const trecho = valores.slice(inicio, i + 1);
            return trecho.reduce((s, v) => s + v, 0) / trecho.length;
        });
    }

    function detectarAnomalias(dados) {
        if (dados.length < 4) return {};
        const margens = dados.map(getMargin);
        const media = margens.reduce((s, v) => s + v, 0) / margens.length;
        const desvio = Math.sqrt(margens.reduce((s, v) => s + (v - media) ** 2, 0) / margens.length);
        const fora = {};
        if (desvio < 0.01) return fora;
        dados.forEach((item, i) => {
            const z = (margens[i] - media) / desvio;
            if (Math.abs(z) >= 2) {
                fora[item.month] = {
                    direcao: z > 0 ? 'acima' : 'abaixo',
                    desvios: Math.abs(z),
                    margem: margens[i],
                    media,
                };
            }
        });
        return fora;
    }

    function mesCorrenteTexto() {
        const hoje = new Date();
        return `${MESES_ORDEM[hoje.getMonth()]}/${hoje.getFullYear()}`;
    }

    function projecaoDoMes(item) {
        if (!item || item.month !== mesCorrenteTexto()) return null;
        const hoje = new Date();
        const diasCorridos = hoje.getDate();
        const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
        if (diasCorridos >= diasNoMes) return null;
        const fator = diasNoMes / diasCorridos;
        return {
            diasCorridos,
            diasNoMes,
            receita: getGrossIncome(item) * fator,
            despesa: item.expenses * fator,
            lucro: getProfit(item) * fator,
        };
    }

    function calculateTrend(fullData, currentData, metricFn) {
        const currentPeriodValue = currentData.reduce((sum, item) => sum + metricFn(item), 0);

        if (currentData.length === 0 || currentData.length === fullData.length) {
            return { value: currentPeriodValue, change: 0 };
        }

        const firstMonthIndex = fullData.findIndex((d) => d.month === currentData[0].month);
        const previousPeriodStartIndex = Math.max(0, firstMonthIndex - currentData.length);
        const previousPeriodData = fullData.slice(previousPeriodStartIndex, firstMonthIndex);

        if (previousPeriodData.length === 0) {
            return { value: currentPeriodValue, change: 0 };
        }

        const previousPeriodValue = previousPeriodData.reduce((sum, item) => sum + metricFn(item), 0);

        if (previousPeriodValue === 0) {
            return { value: currentPeriodValue, change: currentPeriodValue > 0 ? 100 : 0 };
        }

        const change = ((currentPeriodValue - previousPeriodValue) / previousPeriodValue) * 100;
        return { value: currentPeriodValue, change: change };
    }

    function agregarCategorias(dados) {
        const total = {};
        dados.forEach((item) => {
            Object.keys(item.categorias || {}).forEach((cat) => {
                total[cat] = (total[cat] || 0) + item.categorias[cat];
            });
        });
        return total;
    }

    function pareceBackupDoCaixa(json) {
        return (
            json &&
            typeof json === 'object' &&
            !Array.isArray(json) &&
            (Array.isArray(json.vendas) || Array.isArray(json.boletos))
        );
    }

    function campoDaForma(id) {
        const chave = String(id || '')
            .trim()
            .toLowerCase();
        if (!chave) return null;
        if (
            chave.startsWith('cartao') ||
            chave.startsWith('cartão') ||
            chave.startsWith('credito') ||
            chave.startsWith('debito')
        )
            return 'card';
        if (chave.startsWith('pix')) return 'pix';
        if (chave.startsWith('dinheiro') || chave.startsWith('especie') || chave.startsWith('espécie')) return 'cash';
        return null;
    }

    function converterBackupDoCaixa(json) {
        const agora = new Date();
        const mesCorrente = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;

        const meses = {};
        const naoMapeadas = {};
        let mesesIgnorados = new Set();
        let totalPessoais = 0;

        const chaveMes = (data) => String(data || '').slice(0, 7);
        const rotulo = (mes) => {
            const [ano, num] = mes.split('-');
            return `${MESES_ORDEM[Number(num) - 1]}/${ano}`;
        };
        const garante = (mes) =>
            (meses[mes] ||= { cash: 0, card: 0, pix: 0, ifood: 0, expenses: 0, cmv: 0, categorias: {} });
        // Só entram meses inteiros já fechados.
        const aceita = (mes) => {
            if (!/^\d{4}-\d{2}$/.test(mes) || !MESES_ORDEM[Number(mes.slice(5)) - 1]) return false;
            if (mes >= mesCorrente) {
                mesesIgnorados.add(mes);
                return false;
            }
            return true;
        };

        (json.vendas || []).forEach((v) => {
            const mes = chaveMes(v && v.data);
            if (!aceita(mes)) return;
            const valor = toNumber(v.valor);
            if (!(valor > 0)) return;
            if (v.tipo === 'entrada') {
                const campo = campoDaForma(v.forma_pagamento);
                if (campo) {
                    garante(mes)[campo] += valor;
                } else {
                    // Nunca descartar em silêncio: o usuário é avisado.
                    const id = v.forma_pagamento || '(sem forma de pagamento)';
                    naoMapeadas[id] = (naoMapeadas[id] || 0) + valor;
                }
            } else {
                garante(mes).expenses += valor;
            }
        });

        (json.boletos || []).forEach((b) => {
            const mes = chaveMes(b && b.data);
            if (!aceita(mes)) return;
            const valor = toNumber(b.valor);
            if (!(valor > 0)) return;
            const registro = garante(mes);
            registro.expenses += valor;
            // Categoria da despesa (item 10). O nome vem com underline no
            // app de caixa ("nota_fiscal"); aqui vira texto legível.
            const categoria =
                String((b && b.categoria) || 'sem categoria')
                    .trim()
                    .toLowerCase()
                    .replace(/_/g, ' ') || 'sem categoria';
            registro.categorias[categoria] = (registro.categorias[categoria] || 0) + valor;
            // Nota fiscal é compra de mercadoria, ou seja, CMV (item 11).
            if (categoria.indexOf('nota') !== -1) registro.cmv += valor;
        });

        // Saídas de caixa não têm categoria no sistema de origem.
        Object.keys(meses).forEach((mes) => {
            const r = meses[mes];
            const somaCategorias = Object.values(r.categorias).reduce((s, v) => s + v, 0);
            const resto = r.expenses - somaCategorias;
            if (resto > 0.01) r.categorias['saídas de caixa'] = resto;
        });

        (json.gastos_pessoais || []).forEach((g) => {
            totalPessoais += toNumber(g && g.valor);
        });

        const registros = Object.keys(meses)
            .sort()
            .map((mes) => ({ month: rotulo(mes), ...meses[mes] }));
        return {
            registros,
            naoMapeadas,
            mesesIgnorados: [...mesesIgnorados].sort().map(rotulo),
            totalPessoais,
        };
    }
    const config = { ...CONFIG_PADRAO };

    // ------------------------------------------------------------
    // Comparações que dependem do conjunto de meses. Recebem a lista
    // como parâmetro em vez de ler um global, para poderem ser testadas.
    // ------------------------------------------------------------
    function mesmoMesAnoAnterior(mesTexto, dados) {
        const chave = monthSortKey(mesTexto);
        if (chave === Number.MAX_SAFE_INTEGER) return null;
        return (dados || []).find((d) => monthSortKey(d.month) === chave - 12) || null;
    }

    function variacaoAnual(item, dados) {
        const anterior = mesmoMesAnoAnterior(item.month, dados);
        if (!anterior) return null;
        const base = getGrossIncome(anterior);
        if (!(base > 0)) return null;
        return { anterior, variacao: ((getGrossIncome(item) - base) / base) * 100 };
    }

    // Recorte contínuo entre dois meses, em qualquer ordem.
    function fatiarPeriodo(dados, inicioMes, fimMes) {
        let i = dados.findIndex((d) => d.month === inicioMes);
        let f = dados.findIndex((d) => d.month === fimMes);
        if (i === -1 || f === -1) return [];
        if (i > f) {
            const t = i;
            i = f;
            f = t;
        }
        return dados.slice(i, f + 1);
    }

    return {
        escapeHtml,
        escapeCsv,
        toNumber,
        normalizeRecord,
        marcarAtualizacao,
        monthSortKey,
        sortData,
        formatCurrency,
        getGrossIncome,
        getFees,
        getNetIncome,
        getProfit,
        getMargin,
        getContributionMargin,
        getTicket,
        somar,
        mediaMovel,
        medianaDe,
        detectarAnomalias,
        calculateTrend,
        agregarCategorias,
        pareceBackupDoCaixa,
        campoDaForma,
        converterBackupDoCaixa,
        lerLinhaCsv,
        converterCsv,
        construirSumarioExecutivo,
        projecaoDoMes,
        mesCorrenteTexto,
        MONTH_MAP,
        MESES_ORDEM,
        CONFIG_PADRAO,
        config,
        mesmoMesAnoAnterior,
        variacaoAnual,
        fatiarPeriodo,
    };
});
