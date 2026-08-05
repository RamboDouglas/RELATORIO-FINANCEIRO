// ============================================================
// TESTES DO NÚCLEO DE CÁLCULO
//
// Rodam em Node, sem navegador: cobrem a parte onde um erro
// significa número errado no relatório do dono da loja.
//
//   npm run test:unit
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../js/core.js');

const {
    toNumber,
    normalizeRecord,
    monthSortKey,
    sortData,
    escapeHtml,
    escapeCsv,
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
    variacaoAnual,
    fatiarPeriodo,
    converterCsv,
    converterBackupDoCaixa,
    pareceBackupDoCaixa,
    campoDaForma,
    construirSumarioExecutivo,
    config,
    CONFIG_PADRAO,
} = core;

const mes = (month, extra = {}) =>
    normalizeRecord({ month, cash: 0, card: 0, pix: 0, ifood: 0, expenses: 0, ...extra });

function comTaxas(cartao, ifood, fn) {
    const anterior = { ...config };
    config.taxaCartao = cartao;
    config.taxaIfood = ifood;
    try {
        fn();
    } finally {
        Object.assign(config, anterior);
    }
}

// ------------------------------------------------------------
test('toNumber aceita número, texto e formato brasileiro', () => {
    assert.equal(toNumber(1234.56), 1234.56);
    assert.equal(toNumber('1234.56'), 1234.56);
    assert.equal(toNumber('1.234,56'), 1234.56);
    assert.equal(toNumber('R$ 2.500,00'), 2500);
    assert.equal(toNumber('1.234.567'), 1234567, 'mais de um ponto só pode ser separador de milhar');
    assert.equal(toNumber('-100'), -100);
});

test('toNumber devolve zero para entradas inválidas em vez de NaN', () => {
    [null, undefined, '', 'abc', NaN, Infinity, {}].forEach((v) => {
        assert.equal(toNumber(v), 0, `falhou para ${String(v)}`);
    });
});

test('normalizeRecord preenche os campos novos e limita o CMV à despesa', () => {
    const r = normalizeRecord({ month: '  Mai/2025  ', cash: '100', expenses: 500, cmv: 900 });
    assert.equal(r.month, 'Mai/2025');
    assert.equal(r.cash, 100);
    assert.equal(r.cmv, 500, 'o CMV não pode passar da despesa total');
    assert.equal(r.vendas, 0);
    assert.deepEqual(r.categorias, {});
});

test('normalizeRecord ignora categorias com valor não positivo', () => {
    const r = normalizeRecord({ month: 'Jan/2025', categorias: { Aluguel: 100, Vazio: 0, Ruim: 'x' } });
    assert.deepEqual(r.categorias, { aluguel: 100 });
});

// ------------------------------------------------------------
test('ordenação entende grafias diferentes e joga inválidos para o fim', () => {
    const ordem = sortData([
        { month: 'Jan/2025' },
        { month: 'MAIO/25' },
        { month: 'Dez/2024' },
        { month: 'set/2024' },
        { month: 'lixo' },
        { month: 'Fev/2025' },
    ]).map((d) => d.month);
    assert.deepEqual(ordem, ['set/2024', 'Dez/2024', 'Jan/2025', 'Fev/2025', 'MAIO/25', 'lixo']);
});

test('monthSortKey não aceita chaves herdadas do protótipo', () => {
    assert.equal(monthSortKey('constructor/2025'), Number.MAX_SAFE_INTEGER);
    assert.equal(monthSortKey('toString/2025'), Number.MAX_SAFE_INTEGER);
});

test('sortData não altera o array recebido', () => {
    const original = [{ month: 'Dez/2024' }, { month: 'Jan/2024' }];
    const copia = [...original];
    sortData(original);
    assert.deepEqual(original, copia);
});

// ------------------------------------------------------------
test('escapeHtml neutraliza aspas e sinais de marcação', () => {
    assert.equal(escapeHtml(`Jan/2025'),alert(1),('`), 'Jan/2025&#039;),alert(1),(&#039;');
    assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
});

test('escapeCsv protege contra fórmula de planilha', () => {
    assert.equal(escapeCsv('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
    assert.equal(escapeCsv('Mai/2025'), '"Mai/2025"');
});

// ------------------------------------------------------------
test('receita, taxas, lucro e margem', () => {
    const item = mes('Mai/2025', { cash: 1000, card: 2000, pix: 500, ifood: 500, expenses: 3000 });
    assert.equal(getGrossIncome(item), 4000);

    comTaxas(0, 0, () => {
        assert.equal(getFees(item), 0);
        assert.equal(getNetIncome(item), 4000);
        assert.equal(getProfit(item), 1000);
        assert.equal(getMargin(item), 25);
    });

    comTaxas(3, 20, () => {
        assert.equal(getFees(item), 2000 * 0.03 + 500 * 0.2);
        assert.equal(getNetIncome(item), 4000 - 160);
        assert.equal(getProfit(item), 840);
    });
});

test('margem é zero quando não há receita, sem divisão por zero', () => {
    const vazio = mes('Jan/2025', { expenses: 100 });
    assert.equal(getMargin(vazio), 0);
    assert.equal(Number.isFinite(getProfit(vazio)), true);
});

test('margem de contribuição e ticket médio só existem com os dados preenchidos', () => {
    const semExtras = mes('Jan/2025', { cash: 1000, expenses: 500 });
    assert.equal(getContributionMargin(semExtras), null);
    assert.equal(getTicket(semExtras), null);

    const completo = mes('Jan/2025', { cash: 1000, expenses: 500, cmv: 400, vendas: 50 });
    comTaxas(0, 0, () => {
        assert.equal(getContributionMargin(completo), 60);
        assert.equal(getTicket(completo), 20);
    });
});

// ------------------------------------------------------------
test('média móvel de três meses', () => {
    assert.deepEqual(mediaMovel([3, 6, 9, 12], 3), [3, 4.5, 6, 9]);
});

test('mediana com quantidade par e ímpar', () => {
    assert.equal(medianaDe([1, 3, 5]), 3);
    assert.equal(medianaDe([1, 3, 5, 7]), 4);
    assert.equal(medianaDe([]), 0);
});

test('anomalia exige histórico mínimo e sinaliza o mês fora da curva', () => {
    const estaveis = ['Jan/2025', 'Fev/2025', 'Mar/2025'].map((m) => mes(m, { cash: 1000, expenses: 800 }));
    assert.deepEqual(detectarAnomalias(estaveis), {}, 'com menos de 4 meses não há base');

    const comOutlier = [
        ...['Jan/2025', 'Fev/2025', 'Mar/2025', 'Abr/2025', 'Mai/2025'].map((m) =>
            mes(m, { cash: 1000, expenses: 800 }),
        ),
        mes('Jun/2025', { cash: 1000, expenses: 100 }),
    ];
    comTaxas(0, 0, () => {
        const fora = detectarAnomalias(comOutlier);
        assert.ok(fora['Jun/2025'], 'o mês destoante deveria ser sinalizado');
        assert.equal(fora['Jun/2025'].direcao, 'acima');
    });
});

// ------------------------------------------------------------
test('tendência compara com o período anterior de mesmo tamanho', () => {
    const todos = ['Jan/2025', 'Fev/2025', 'Mar/2025', 'Abr/2025'].map((m, i) => mes(m, { cash: (i + 1) * 100 }));
    const recorte = todos.slice(2); // Mar e Abr: 300 + 400 = 700; anteriores: 100 + 200 = 300
    const t = calculateTrend(todos, recorte, getGrossIncome);
    assert.equal(t.value, 700);
    assert.equal(Math.round(t.change), 133);
});

test('tendência é neutra quando o período é o histórico inteiro', () => {
    const todos = ['Jan/2025', 'Fev/2025'].map((m) => mes(m, { cash: 100 }));
    assert.equal(calculateTrend(todos, todos, getGrossIncome).change, 0);
});

test('comparação ano a ano encontra o mesmo mês do ano anterior', () => {
    const dados = [mes('Dez/2024', { cash: 100 }), mes('Dez/2025', { cash: 150 })];
    const v = variacaoAnual(dados[1], dados);
    assert.equal(v.anterior.month, 'Dez/2024');
    assert.equal(v.variacao, 50);
    assert.equal(variacaoAnual(dados[0], dados), null, 'sem par no ano anterior');
});

test('fatiarPeriodo aceita os limites em qualquer ordem', () => {
    const dados = ['Jan/2025', 'Fev/2025', 'Mar/2025'].map((m) => mes(m));
    assert.equal(fatiarPeriodo(dados, 'Mar/2025', 'Jan/2025').length, 3);
    assert.equal(fatiarPeriodo(dados, 'Fev/2025', 'Fev/2025').length, 1);
    assert.deepEqual(fatiarPeriodo(dados, 'Jan/2025', 'Inexistente'), []);
});

test('somar e agregarCategorias', () => {
    const dados = [
        mes('Jan/2025', { cash: 100, categorias: { aluguel: 10, luz: 5 } }),
        mes('Fev/2025', { cash: 200, categorias: { aluguel: 20 } }),
    ];
    assert.equal(somar(dados, getGrossIncome), 300);
    assert.deepEqual(agregarCategorias(dados), { aluguel: 30, luz: 5 });
});

// ------------------------------------------------------------
test('formas de pagamento do app de caixa caem nas colunas certas', () => {
    assert.equal(campoDaForma('dinheiro'), 'cash');
    assert.equal(campoDaForma('cartao_pagbank'), 'card');
    assert.equal(campoDaForma('cartao_stone'), 'card', 'forma criada depois, reconhecida pelo prefixo');
    assert.equal(campoDaForma('pix_celular'), 'pix');
    assert.equal(campoDaForma('vale_refeicao'), null, 'desconhecida não pode ser adivinhada');
    assert.equal(campoDaForma(''), null);
});

test('backup do caixa é reconhecido e convertido em meses', () => {
    const backup = {
        vendas: [
            { valor: 1000, data: '2020-05-02', tipo: 'entrada', forma_pagamento: 'dinheiro' },
            { valor: 2000, data: '2020-05-03', tipo: 'entrada', forma_pagamento: 'cartao_sistema' },
            { valor: 100, data: '2020-05-03', tipo: 'saida', descricao: 'gelo' },
            { valor: 999, data: '2020-05-04', tipo: 'entrada', forma_pagamento: 'vale_refeicao' },
        ],
        boletos: [
            { valor: 500, data: '2020-05-10', fornecedor: 'X', categoria: 'nota_fiscal' },
            { valor: 300, data: '2020-05-11', fornecedor: 'Y', categoria: 'aluguel' },
        ],
        gastos_pessoais: [{ valor: 5000, data: '2020-05-12', descricao: 'obra', categoria: 'obra' }],
    };

    assert.equal(pareceBackupDoCaixa(backup), true);
    assert.equal(pareceBackupDoCaixa([{ month: 'Jan/2025' }]), false);

    const r = converterBackupDoCaixa(backup);
    assert.equal(r.registros.length, 1);
    const maio = r.registros[0];
    assert.equal(maio.month, 'Mai/2020');
    assert.equal(maio.cash, 1000);
    assert.equal(maio.card, 2000);
    assert.equal(maio.ifood, 0, 'o app de caixa não separa iFood');
    assert.equal(maio.expenses, 100 + 500 + 300, 'saídas de caixa somam com os boletos');
    assert.equal(maio.cmv, 500, 'nota fiscal é compra de mercadoria');
    assert.equal(maio.categorias['nota fiscal'], 500);
    assert.equal(maio.categorias['saídas de caixa'], 100);
    assert.equal(r.totalPessoais, 5000, 'gastos pessoais ficam de fora, mas são informados');
    assert.equal(r.naoMapeadas['vale_refeicao'], 999, 'forma desconhecida é reportada, não descartada');
});

test('backup do caixa não importa o mês em aberto', () => {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const r = converterBackupDoCaixa({
        vendas: [{ valor: 10, data: `${mesAtual}-01`, tipo: 'entrada', forma_pagamento: 'dinheiro' }],
        boletos: [],
    });
    assert.equal(r.registros.length, 0);
    assert.equal(r.mesesIgnorados.length, 1);
});

// ------------------------------------------------------------
test('CSV é lido com ponto e vírgula ou vírgula, respeitando aspas', () => {
    const comPontoEVirgula = 'Mês;Entrada (Dinheiro);Saídas (Despesas)\n"Mai/2025";1000;500';
    const a = converterCsv(comPontoEVirgula);
    assert.equal(a.registros.length, 1);
    assert.equal(a.registros[0].cash, 1000);
    assert.equal(a.registros[0].expenses, 500);

    const comVirgula = 'Mês,Entrada (Dinheiro),Saídas (Despesas)\n"Jun/2025",10,20';
    assert.equal(converterCsv(comVirgula).registros[0].month, 'Jun/2025');
});

test('CSV sem coluna de mês é recusado e linhas inválidas são contadas', () => {
    assert.ok(converterCsv('A;B\n1;2').erro);
    const r = converterCsv('Mês;Entrada (Dinheiro)\n"Mai/2025";10\n"nada";20');
    assert.equal(r.registros.length, 1);
    assert.deepEqual(r.ignoradas, [3]);
});

// ------------------------------------------------------------
test('sumário executivo descreve o período em frases', () => {
    const dados = [mes('Jan/2025', { cash: 1000, expenses: 500 }), mes('Fev/2025', { cash: 2000, expenses: 2500 })];
    comTaxas(0, 0, () => {
        const linhas = construirSumarioExecutivo(dados);
        assert.ok(linhas.length >= 3);
        assert.ok(linhas.some((l) => l.includes('Melhor mês')));
        assert.ok(
            linhas.some((l) => l.includes('prejuízo')),
            'Fev teve prejuízo e deve ser citado',
        );
    });
    assert.deepEqual(construirSumarioExecutivo([]), ['Nenhum mês selecionado.']);
});

test('a configuração começa nos valores padrão', () => {
    assert.deepEqual(CONFIG_PADRAO, { taxaCartao: 0, taxaIfood: 0, metaReceita: 0, metaMargem: 0 });
});
