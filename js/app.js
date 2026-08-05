// #############################################################
// # 1. GERENCIAMENTO DE DADOS E ESTADO
// #############################################################

// Versão do formato do arquivo de backup (item 3).
const FORMATO_BACKUP = 2;

// Versão exibida no rodapé e usada no CHANGELOG (item 45).
const APP_VERSAO = '1.0.0';

let financialData = [];
let pendingBackup = null;
let pendingBackupOrigem = 'painel';
let pendingBackupConfig = null;

const initialData = [
    { month: 'Set/2024', cash: 29378.76, card: 84601.14, pix: 19906.8, ifood: 2254.6, expenses: 86227.97 },
    { month: 'Out/2024', cash: 34786.49, card: 102718.1, pix: 28953.75, ifood: 2057.33, expenses: 117825.87 },
    { month: 'Nov/2024', cash: 47721.47, card: 115894.53, pix: 42601.93, ifood: 2037.6, expenses: 144485.17 },
    { month: 'Dez/2024', cash: 88992.34, card: 241385.57, pix: 76599.2, ifood: 3229.63, expenses: 222718.65 },
    { month: 'Jan/2025', cash: 101984.24, card: 172228.62, pix: 62460.42, ifood: 3659.05, expenses: 339583.78 },
    { month: 'Fev/2025', cash: 77208.06, card: 109180.81, pix: 61468.49, ifood: 3430.04, expenses: 188428.35 },
    { month: 'Mar/2025', cash: 63890.25, card: 131323.97, pix: 55000.8, ifood: 2365.74, expenses: 163185.99 },
    { month: 'Abr/2025', cash: 45548.77, card: 88766.42, pix: 36495.25, ifood: 3458.16, expenses: 120762.56 },
];

let toastTimer;
function showToast(message, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    const bg = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-gray-800';
    el.textContent = message;
    el.className = `fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:w-96 sm:-ml-48 z-50 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${bg}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 6000);
}

// ============================================================
// ESCAPE DE HTML
// O nome do mês vem de digitação e de arquivos de backup, e é
// inserido via innerHTML em tabela, abas, insights e destaques.
// Sem escapar, um mês como "Jan/2025'),alert(1),('" executava
// código ao ser renderizado dentro do onclick das abas.
// ============================================================

// Aceita número, "1234.56" ou "1.234,56" (formato pt-BR vindo de arquivos editados à mão).

// ============================================================
// CONFIRMAÇÃO EM TELA
// Substitui confirm(), que navegadores embutidos de aplicativos
// bloqueiam — ali a confirmação voltava "não" sozinha.
// ============================================================
let confirmacaoPendente = null;

function abrirConfirmacao(titulo, mensagemHtml, rotuloOk, classesOk, aoConfirmar) {
    confirmacaoPendente = aoConfirmar;
    document.getElementById('confirm-title').textContent = titulo;
    document.getElementById('confirm-message').innerHTML = mensagemHtml;
    const botao = document.getElementById('confirm-ok');
    botao.textContent = rotuloOk;
    botao.className = `w-full px-4 py-3 text-white rounded-md font-medium ${classesOk}`;
    document.getElementById('confirm-modal').classList.remove('hidden');
    focarModal('confirm-modal');
}

function fecharConfirmacao() {
    confirmacaoPendente = null;
    document.getElementById('confirm-modal').classList.add('hidden');
}

document.getElementById('confirm-ok').addEventListener('click', () => {
    const acao = confirmacaoPendente;
    fecharConfirmacao();
    if (acao) acao();
});

// ============================================================
// DESFAZER (item 5) E CÓPIA AUTOMÁTICA (item 4)
// Antes de qualquer ação destrutiva o estado atual é guardado em
// memória, para o botão Desfazer, e no armazenamento local, como
// rede de proteção caso a página seja fechada logo depois.
// ============================================================
let estadoParaDesfazer = null;
let undoTimer;

function clonarDados(dados) {
    return dados.map((d) => ({ ...d, categorias: { ...d.categorias } }));
}

function guardarCopiaAutomatica(motivo) {
    try {
        localStorage.setItem(
            'financialReportAutoBackup',
            JSON.stringify({
                motivo,
                criadoEm: new Date().toISOString(),
                dados: financialData,
            }),
        );
    } catch (err) {
        /* sem espaço: o desfazer em memória continua valendo */
    }
}

function guardarParaDesfazer(mensagem, motivo) {
    guardarCopiaAutomatica(motivo || mensagem);
    estadoParaDesfazer = { dados: clonarDados(financialData), mensagem };
    const barra = document.getElementById('undo-bar');
    document.getElementById('undo-text').textContent = mensagem.replace(' desfeita.', '').replace(' desfeito.', '');
    barra.classList.remove('hidden');
    barra.classList.add('flex');
    clearTimeout(undoTimer);
    undoTimer = setTimeout(esconderDesfazer, 12000);
}

function esconderDesfazer() {
    const barra = document.getElementById('undo-bar');
    barra.classList.add('hidden');
    barra.classList.remove('flex');
}

function desfazerUltimaAcao() {
    if (!estadoParaDesfazer) {
        esconderDesfazer();
        return;
    }
    financialData = sortData(estadoParaDesfazer.dados);
    const mensagem = estadoParaDesfazer.mensagem;
    estadoParaDesfazer = null;
    esconderDesfazer();
    saveData();
    updateDashboard(financialData);
    showToast(mensagem, 'success');
}

// ============================================================
// CONFIGURAÇÃO (taxas e metas)
// Guardada à parte dos meses, porque vale para o painel inteiro.
// ============================================================

function salvarConfig() {
    try {
        localStorage.setItem('financialReportConfig', JSON.stringify(config));
        return true;
    } catch (err) {
        showToast('Não foi possível salvar as configurações neste navegador.', 'error');
        return false;
    }
}

function abrirConfig() {
    document.getElementById('cfg-taxa-cartao').value = config.taxaCartao || '';
    document.getElementById('cfg-taxa-ifood').value = config.taxaIfood || '';
    document.getElementById('cfg-meta-receita').value = config.metaReceita || '';
    document.getElementById('cfg-meta-margem').value = config.metaMargem || '';
    document.getElementById('config-modal').classList.remove('hidden');
    focarModal('config-modal');
}

function fecharConfig() {
    document.getElementById('config-modal').classList.add('hidden');
}

document.getElementById('config-form').addEventListener('submit', (e) => {
    e.preventDefault();
    config.taxaCartao = Math.min(100, Math.max(0, toNumber(document.getElementById('cfg-taxa-cartao').value)));
    config.taxaIfood = Math.min(100, Math.max(0, toNumber(document.getElementById('cfg-taxa-ifood').value)));
    config.metaReceita = Math.max(0, toNumber(document.getElementById('cfg-meta-receita').value));
    config.metaMargem = Math.min(100, Math.max(0, toNumber(document.getElementById('cfg-meta-margem').value)));
    const salvo = salvarConfig();
    fecharConfig();
    updateDashboard(dadosVisiveis());
    if (salvo) showToast('Taxas e metas atualizadas.', 'success');
});

function carregarConfig() {
    let bruto = null;
    try {
        bruto = localStorage.getItem('financialReportConfig');
    } catch (err) {
        bruto = null;
    }
    Object.assign(config, CONFIG_PADRAO);
    if (!bruto) return;
    try {
        const salvo = JSON.parse(bruto);
        if (salvo && typeof salvo === 'object') {
            config.taxaCartao = Math.min(100, Math.max(0, toNumber(salvo.taxaCartao)));
            config.taxaIfood = Math.min(100, Math.max(0, toNumber(salvo.taxaIfood)));
            config.metaReceita = Math.max(0, toNumber(salvo.metaReceita));
            config.metaMargem = Math.min(100, Math.max(0, toNumber(salvo.metaMargem)));
        }
    } catch (err) {
        /* configuração inválida: fica o padrão */
    }
}

function saveData() {
    try {
        if (senhaAtiva) {
            // Com bloqueio ativo, o conteúdo legível some do armazenamento.
            cifrarDados(senhaAtiva, financialData)
                .then((cofre) => localStorage.setItem(CHAVE_COFRE, JSON.stringify(cofre)))
                .catch(() => showToast('Falha ao gravar os dados protegidos.', 'error'));
            localStorage.removeItem('financialReportData');
            return true;
        }
        localStorage.setItem('financialReportData', JSON.stringify(financialData));
        return true;
    } catch (err) {
        // Acontece em aba anônima, com armazenamento bloqueado ou memória cheia.
        // O aviso é repetido a cada tentativa de propósito: sem ele o usuário
        // acha que salvou e perde tudo ao recarregar a página.
        showToast(
            'O navegador bloqueou o armazenamento (aba anônima ou memória cheia). Os dados estão na tela, mas somem ao recarregar — use o botão Backup para guardar o arquivo.',
            'error',
        );
        return false;
    }
}

function loadData() {
    let savedData = null;
    try {
        savedData = localStorage.getItem('financialReportData');
    } catch (err) {
        savedData = null;
    }

    let data = initialData;
    let savedDataValid = false;
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (Array.isArray(parsed)) {
                data = parsed;
                savedDataValid = true;
            }
        } catch (err) {
            /* tratado abaixo */
        }
        if (!savedDataValid) {
            showToast('Os dados salvos estavam corrompidos; carregando os dados iniciais.', 'error');
        }
    }

    financialData = sortData(data.map(normalizeRecord));
    // Regrava também quando o conteúdo salvo era inválido, para não repetir o erro.
    if (!savedDataValid) saveData();
}

// Meses fora do padrão ("maio/25", "MAR/2025") continuam ordenando corretamente;
// os irreconhecíveis vão para o fim em vez de gerar NaN e bagunçar a lista.

// #############################################################
// # 2. LÓGICA DO MODAL E AÇÕES CRUD
// #############################################################

const modal = document.getElementById('data-modal');
const form = document.getElementById('data-form');

// Seletores de mês e ano no lugar de texto livre: a grafia passa a ser
// sempre a mesma, o que antes dependia de o usuário digitar certo.
function popularSeletoresDeMes() {
    const selMes = document.getElementById('month-name');
    const selAno = document.getElementById('month-year');
    if (selMes.options.length === 0) {
        selMes.innerHTML = MESES_ORDEM.map((m, i) => `<option value="${m}">${m}</option>`).join('');
    }
    const anoAtual = new Date().getFullYear();
    const anos = new Set();
    for (let a = anoAtual - 6; a <= anoAtual + 1; a++) anos.add(a);
    // Anos já usados nos dados continuam disponíveis mesmo fora da faixa.
    financialData.forEach((d) => {
        const ano = parseInt(String(d.month).split('/')[1], 10);
        if (!isNaN(ano)) anos.add(ano < 100 ? ano + 2000 : ano);
    });
    const lista = [...anos].sort((a, b) => b - a);
    const anterior = selAno.value;
    selAno.innerHTML = lista.map((a) => `<option value="${a}">${a}</option>`).join('');
    if (anterior && lista.includes(Number(anterior))) selAno.value = anterior;
}

function lerMesDoFormulario() {
    return `${document.getElementById('month-name').value}/${document.getElementById('month-year').value}`;
}

function preencherSeletoresDeMes(mesTexto) {
    const partes = String(mesTexto || '').split('/');
    const nome = (partes[0] || '').trim().toLowerCase();
    const indice = MESES_ORDEM.findIndex((m) => m.toLowerCase() === nome.slice(0, 3));
    let ano = parseInt(partes[1], 10);
    if (!isNaN(ano) && ano < 100) ano += 2000;
    const selMes = document.getElementById('month-name');
    const selAno = document.getElementById('month-year');
    if (indice !== -1) selMes.value = MESES_ORDEM[indice];
    if (!isNaN(ano)) {
        // Mês antigo de um ano fora da faixa: acrescenta a opção.
        if (![...selAno.options].some((o) => Number(o.value) === ano)) {
            selAno.insertAdjacentHTML('afterbegin', `<option value="${ano}">${ano}</option>`);
        }
        selAno.value = String(ano);
    }
}

function openModal(index = null) {
    form.reset();
    document.getElementById('form-warning').classList.add('hidden');
    document.getElementById('edit-index').value = '';
    popularSeletoresDeMes();

    if (index !== null) {
        document.getElementById('modal-title').textContent = 'Editar Mês';
        const data = financialData[index];
        preencherSeletoresDeMes(data.month);
        document.getElementById('cash').value = data.cash;
        document.getElementById('card').value = data.card;
        document.getElementById('pix').value = data.pix;
        document.getElementById('ifood').value = data.ifood;
        document.getElementById('expenses').value = data.expenses;
        document.getElementById('cmv').value = data.cmv || '';
        document.getElementById('sales-count').value = data.vendas || '';
        document.getElementById('edit-index').value = index;
    } else {
        document.getElementById('modal-title').textContent = 'Adicionar Novo Mês';
        // Sugere o mês passado, que é o que normalmente se lança.
        const ref = new Date();
        ref.setMonth(ref.getMonth() - 1);
        preencherSeletoresDeMes(`${MESES_ORDEM[ref.getMonth()]}/${ref.getFullYear()}`);
    }
    modal.classList.remove('hidden');
    focarModal('data-modal');
}

function closeModal() {
    modal.classList.add('hidden');
}

// ============================================================
// ALERTA DE VALOR FORA DO PADRÃO (item 8)
// Compara o que está sendo digitado com a mediana do histórico.
// Não bloqueia nada: só chama atenção para um zero a mais ou a
// menos antes de o número entrar no relatório.
// ============================================================

function checarAnomalias(registro, mesEditado) {
    const outros = financialData.filter((d) => d.month !== mesEditado);
    if (outros.length < 3) return [];
    const avisos = [];
    const campos = [
        {
            chave: 'receita',
            rotulo: 'A receita bruta',
            valor: getGrossIncome(registro),
            historico: outros.map(getGrossIncome),
        },
        { chave: 'despesa', rotulo: 'A despesa', valor: registro.expenses, historico: outros.map((d) => d.expenses) },
    ];
    campos.forEach((campo) => {
        const mediana = medianaDe(campo.historico.filter((v) => v > 0));
        if (!(mediana > 0) || !(campo.valor > 0)) return;
        const razao = campo.valor / mediana;
        if (razao >= 3) {
            avisos.push(
                `${campo.rotulo} está ${razao.toFixed(1)}× acima da mediana dos outros meses (${formatCurrency(mediana)}). Confira se não sobrou um zero.`,
            );
        } else if (razao <= 1 / 3) {
            avisos.push(
                `${campo.rotulo} está ${(1 / razao).toFixed(1)}× abaixo da mediana dos outros meses (${formatCurrency(mediana)}). Confira se não faltou um dígito.`,
            );
        }
    });
    return avisos;
}

let anomaliasConfirmadas = '';

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const editIndex = document.getElementById('edit-index').value;
    const anterior = editIndex !== '' ? financialData[Number(editIndex)] : null;

    const newData = normalizeRecord({
        month: lerMesDoFormulario(),
        cash: document.getElementById('cash').value,
        card: document.getElementById('card').value,
        pix: document.getElementById('pix').value,
        ifood: document.getElementById('ifood').value,
        expenses: document.getElementById('expenses').value,
        cmv: document.getElementById('cmv').value,
        vendas: document.getElementById('sales-count').value,
        // Categorias vindas da importação do caixa são preservadas na edição.
        categorias: anterior ? anterior.categorias : {},
    });

    if (!newData.month || newData.month.indexOf('/') === -1) {
        showToast('Selecione o mês e o ano.', 'error');
        return;
    }

    // Primeiro envio com valor atípico só avisa; o segundo confirma.
    const avisos = checarAnomalias(newData, anterior ? anterior.month : '');
    const assinatura = newData.month + '|' + getGrossIncome(newData) + '|' + newData.expenses;
    const caixaAviso = document.getElementById('form-warning');
    if (avisos.length > 0 && anomaliasConfirmadas !== assinatura) {
        anomaliasConfirmadas = assinatura;
        caixaAviso.innerHTML = `<strong>Confira antes de salvar:</strong><br>${avisos.map(escapeHtml).join('<br>')}<br><span class="block mt-2">Se estiver certo, toque em Salvar de novo.</span>`;
        caixaAviso.classList.remove('hidden');
        return;
    }
    anomaliasConfirmadas = '';
    caixaAviso.classList.add('hidden');

    const registro = marcarAtualizacao(newData);
    let message = `${registro.month} adicionado.`;

    if (editIndex !== '') {
        financialData[Number(editIndex)] = registro;
        message = `${registro.month} atualizado.`;
    } else {
        // Evita dois registros do mesmo mês, que fazem os botões de editar/excluir
        // agirem sempre na primeira ocorrência.
        const duplicate = financialData.findIndex((d) => d.month.toLowerCase() === registro.month.toLowerCase());
        if (duplicate !== -1) {
            financialData[duplicate] = registro;
            message = `${registro.month} já existia e foi atualizado.`;
        } else {
            financialData.push(registro);
        }
    }

    financialData = sortData(financialData);
    // A tela é atualizada mesmo se a gravação falhar (o saveData avisa o usuário).
    const saved = saveData();
    // Mantém o recorte que estava na tela, acrescido do mês recém-salvo (item 32).
    updateDashboard(recorteAtualizado(registro.month));
    closeModal();
    // Se a gravação falhou, o aviso do saveData é mais importante e fica na tela.
    if (saved) showToast(message, 'success');
});

function deleteData(index) {
    const alvo = financialData[index];
    if (!alvo) return;
    abrirConfirmacao(
        'Excluir mês',
        `Excluir os dados de <strong>${escapeHtml(alvo.month)}</strong>? Dá para desfazer logo em seguida.`,
        'Excluir',
        'bg-red-600 hover:bg-red-700',
        () => {
            guardarParaDesfazer(`Exclusão de ${alvo.month} desfeita.`);
            financialData.splice(index, 1);
            saveData();
            updateDashboard(recorteAtualizado());
            showToast(`${alvo.month} excluído.`, 'success');
        },
    );
}

// #############################################################
// # 3. FUNÇÕES DE EXPORTAÇÃO
// #############################################################

// Escapa campo de texto do CSV e neutraliza fórmula (=, +, -, @),
// que o Excel executaria ao abrir o arquivo.

function exportDataToCSV() {
    // Respeita o filtro aplicado (item 22).
    const dados = dadosVisiveis();
    if (dados.length === 0) {
        showToast('Não há dados para exportar.', 'error');
        return;
    }
    const headers = [
        'Mês',
        'Entrada (Dinheiro)',
        'Entrada (Cartão)',
        'Entrada (Pix)',
        'Entrada (iFood)',
        'Entrada Bruta',
        'Taxas',
        'Receita Líquida',
        'Saídas (Despesas)',
        'Mercadoria (CMV)',
        'Nº de Vendas',
        'Lucro',
        'Margem (%)',
    ];
    const rows = dados.map((item) => {
        const grossIncome = getGrossIncome(item);
        const profit = getProfit(item);
        const margin = getMargin(item).toFixed(1);
        return [
            escapeCsv(item.month),
            item.cash,
            item.card,
            item.pix,
            item.ifood,
            grossIncome,
            getFees(item).toFixed(2),
            getNetIncome(item).toFixed(2),
            item.expenses,
            item.cmv,
            item.vendas,
            profit.toFixed(2),
            margin,
        ].join(';');
    });
    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio_financeiro.csv';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
    }, 5000);
}

// ============================================================
// SUMÁRIO EXECUTIVO EM TEXTO (item 21)
// As mesmas conclusões que o painel mostra, escritas em frases,
// para quem lê o PDF sem ter o painel na frente.
// ============================================================

// ============================================================
// IMPORTAÇÃO DE CSV (item 23)
// Aceita o arquivo gerado pela exportação e planilhas montadas à
// mão, reconhecendo as colunas pelo cabeçalho e o separador
// (ponto e vírgula ou vírgula) pela primeira linha.
// ============================================================

async function exportToPDF() {
    if (!window.jspdf || typeof html2canvas === 'undefined' || typeof Chart === 'undefined') {
        showToast('As bibliotecas de PDF não carregaram. Verifique a conexão e recarregue a página.', 'error');
        return;
    }

    const btn = document.getElementById('pdf-export-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando...';

    Chart.defaults.animation = false;
    if (revenueExpensesChart) revenueExpensesChart.update();
    if (paymentTrendsChart) paymentTrendsChart.update();

    await new Promise((resolve) => setTimeout(resolve, 500));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    // Item 20: a tabela usava todos os meses enquanto as imagens vinham
    // da tela filtrada, e o PDF saía internamente inconsistente. Agora
    // os dois lados usam o mesmo recorte que está sendo exibido.
    const dataToExport = dadosVisiveis();

    doc.setFontSize(18);
    doc.text('Relatório Financeiro Executivo', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    const totalRevenue = somar(dataToExport, getGrossIncome);
    const totalExpenses = somar(dataToExport, (item) => item.expenses);
    const periodoTexto = dataToExport.length
        ? `${dataToExport[0].month} a ${dataToExport[dataToExport.length - 1].month}`
        : '—';
    doc.text(`Período: ${periodoTexto} (${dataToExport.length} meses)`, 14, 30);
    doc.text(`Receita: ${formatCurrency(totalRevenue)} | Despesa: ${formatCurrency(totalExpenses)}`, 14, 36);

    // Sumário executivo em texto (item 21)
    let cursor = 46;
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text('Sumário', 14, cursor);
    cursor += 7;
    doc.setFontSize(10);
    doc.setTextColor(80);
    construirSumarioExecutivo(dataToExport).forEach((linha) => {
        doc.splitTextToSize(`• ${linha}`, 180).forEach((parte) => {
            doc.text(parte, 14, cursor);
            cursor += 5;
        });
    });
    cursor += 4;

    const revenueCard = document.getElementById('revenue-expenses-card');
    const trendsCard = document.getElementById('payment-trends-card');

    const canvasRevenue = await html2canvas(revenueCard, { scale: 2 });
    const imgDataRevenue = canvasRevenue.toDataURL('image/png');

    const canvasTrends = await html2canvas(trendsCard, { scale: 2 });
    const imgDataTrends = canvasTrends.toDataURL('image/png');

    doc.addPage();
    doc.addImage(imgDataRevenue, 'PNG', 14, 20, 180, 90);
    doc.addImage(imgDataTrends, 'PNG', 14, 115, 180, 90);

    doc.addPage();

    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text('Detalhamento Mensal', 14, 22);
    let y = 30;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(80);
    doc.text('Mês', 14, y);
    doc.text('Receita', 40, y);
    doc.text('Despesa', 80, y);
    doc.text('Lucro', 120, y);
    doc.text('Margem', 160, y);
    y += 7;
    doc.setFont(undefined, 'normal');

    dataToExport.forEach((item) => {
        // Nova página quando o rodapé é alcançado, em vez de escrever fora da folha.
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        const gross = getGrossIncome(item);
        const profit = getProfit(item);
        const margin = `${getMargin(item).toFixed(1)}%`;
        doc.text(item.month, 14, y);
        doc.text(formatCurrency(gross), 40, y);
        doc.text(formatCurrency(item.expenses), 80, y);
        doc.text(formatCurrency(profit), 120, y);
        doc.text(margin, 160, y);
        y += 7;
    });

    doc.save('relatorio_executivo.pdf');

    Chart.defaults.animation = true;
    if (revenueExpensesChart) revenueExpensesChart.update();
    if (paymentTrendsChart) paymentTrendsChart.update();

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-file-pdf mr-2"></i> PDF';
}

// #############################################################
// # 4. FILTRAGEM E RENDERIZAÇÃO DO DASHBOARD
// #############################################################
let revenueExpensesChart, profitMarginChart, paymentMethodsChart, paymentTrendsChart, expenseCategoriesChart;

// Receita bruta: tudo que entrou, antes das taxas das maquininhas e do iFood.

// Taxas retidas por cartão e iFood. Com as taxas em 0 (padrão), a
// receita líquida é igual à bruta e nada muda no painel.

// Receita líquida: o que de fato cai na conta.

// Margem de contribuição: o que sobra depois de pagar a mercadoria,
// antes das despesas operacionais. Só existe se o CMV for informado.

// Ticket médio: só faz sentido com o número de vendas preenchido.

// Soma um campo calculado ao longo de vários meses.

// ============================================================
// COMPARAÇÃO ANO A ANO (item 15)
// Numa conveniência a sazonalidade pesa mais que o mês anterior:
// dezembro contra novembro diz pouco, dezembro contra dezembro
// do ano passado diz muito.
// ============================================================
// ============================================================
// MÉDIA MÓVEL DE TRÊS MESES (item 18)
// Suaviza o ruído mês a mês para a tendência aparecer.
// ============================================================

// ============================================================
// MESES FORA DO PADRÃO (item 19)
// Marca quem se afasta mais de dois desvios-padrão da média da
// margem no período. Com menos de quatro meses não há base.
// ============================================================

// ============================================================
// PROJEÇÃO DO MÊS CORRENTE (item 16)
// Se o mês em curso já está lançado, ele quase sempre está
// incompleto. A projeção estima o fechamento pela proporção de
// dias decorridos, deixando claro que é estimativa.
// ============================================================

function toggleFilterDropdown() {
    document.getElementById('filter-dropdown').classList.toggle('hidden');
}

window.onclick = function (event) {
    if (!event.target.closest('#multi-month-filter')) {
        const dropdown = document.getElementById('filter-dropdown');
        if (!dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    }
};

function populateMonthCheckboxes() {
    const container = document.getElementById('month-checkboxes');
    container.innerHTML = `<div class="px-4 py-2"><label class="inline-flex items-center"><input type="checkbox" id="select-all-months" onchange="toggleAllMonths(this.checked)" class="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded" checked><span class="ml-2 text-sm text-gray-700">Selecionar Todos</span></label></div><div class="border-t border-gray-200"></div>`;
    const selecionados = new Set(dadosRenderizados.map((d) => d.month));
    const usarSelecao = dadosRenderizados.length > 0 && dadosRenderizados.length < financialData.length;
    financialData.forEach((item) => {
        const marcado = usarSelecao ? selecionados.has(item.month) : true;
        container.innerHTML += `<div class="px-4 py-2"><label class="inline-flex items-center"><input type="checkbox" class="month-checkbox form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded" value="${escapeHtml(item.month)}"${marcado ? ' checked' : ''}><span class="ml-2 text-sm text-gray-700">${escapeHtml(item.month)}</span></label></div>`;
    });
    const todos = document.getElementById('select-all-months');
    if (todos) todos.checked = !usarSelecao;
}

function toggleAllMonths(checked) {
    document.querySelectorAll('.month-checkbox').forEach((c) => (c.checked = checked));
}

function filterDashboard() {
    const selectedMonths = Array.from(document.querySelectorAll('.month-checkbox:checked')).map((cb) => cb.value);
    const dataToRender = financialData.filter((d) => selectedMonths.includes(d.month));
    updateDashboard(dataToRender);
    toggleFilterDropdown();
}

// Guarda o recorte que está na tela para poder redesenhar sem
// perder o filtro (ao mudar taxas, ordenar a tabela etc.).
let dadosRenderizados = [];
function dadosVisiveis() {
    return dadosRenderizados.length ? dadosRenderizados : financialData;
}

// Recalcula o recorte visível a partir do que estava filtrado, mantendo
// a seleção do usuário depois de adicionar, editar ou excluir (item 32).
function recorteAtualizado(mesIncluir) {
    const filtrando = dadosRenderizados.length > 0 && dadosRenderizados.length < financialData.length;
    if (!filtrando) return financialData;
    const visiveis = new Set(dadosRenderizados.map((d) => d.month));
    if (mesIncluir) visiveis.add(mesIncluir);
    const recorte = financialData.filter((d) => visiveis.has(d.month));
    return recorte.length > 0 ? recorte : financialData;
}

// Ordenação da tabela (item 24)
let ordenacao = { coluna: 'month', crescente: true };

const COLUNAS_TABELA = [
    { chave: 'month', rotulo: 'Mês', valor: (d) => monthSortKey(d.month) },
    { chave: 'receita', rotulo: 'Entrada Bruta', valor: getGrossIncome },
    { chave: 'despesa', rotulo: 'Saídas', valor: (d) => d.expenses },
    { chave: 'lucro', rotulo: 'Lucro', valor: getProfit },
    { chave: 'margem', rotulo: 'Margem', valor: getMargin },
];

function ordenarPor(coluna) {
    if (ordenacao.coluna === coluna) ordenacao.crescente = !ordenacao.crescente;
    else ordenacao = { coluna, crescente: true };
    updateDashboard(dadosVisiveis());
}

function updateDashboard(dataToRender) {
    dadosRenderizados = dataToRender;
    populateMonthCheckboxes();

    // KPIs com tendência
    const revenueTrend = calculateTrend(financialData, dataToRender, getGrossIncome);
    const expensesTrend = calculateTrend(financialData, dataToRender, (item) => item.expenses);
    const profitTrend = calculateTrend(financialData, dataToRender, getProfit);
    const receitaLiquida = somar(dataToRender, getNetIncome);
    const taxasTotais = somar(dataToRender, getFees);
    const margin = receitaLiquida > 0 ? (profitTrend.value / receitaLiquida) * 100 : 0;
    const anomalias = detectarAnomalias(dataToRender);

    document.getElementById('header-stats').innerHTML =
        `<div class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">Atualizado: ${new Date().toLocaleDateString('pt-BR')}</div><div class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">Período: ${dataToRender.length} mes(es)</div><div class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">Vendas Totais: ${formatCurrency(revenueTrend.value)}</div>`;

    const renderTrend = (trend, positiveUp = true) => {
        if (trend.change === 0) return '';
        const isPositive = positiveUp ? trend.change > 0 : trend.change < 0;
        return `
            <span class="${isPositive ? 'text-green-600' : 'text-red-600'} text-sm font-medium flex items-center">
                <i class="fas ${trend.change > 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1"></i>
                ${Math.abs(trend.change).toFixed(1)}%
            </span>`;
    };

    // Receita líquida só aparece quando há taxa configurada.
    const notaTaxas =
        taxasTotais > 0
            ? `<p class="text-xs text-gray-500 mt-1">Líquida: ${formatCurrency(receitaLiquida)} <span class="text-gray-400">(−${formatCurrency(taxasTotais)} de taxas)</span></p>`
            : '<p class="text-xs text-gray-400">vs. período anterior</p>';

    const totalVendas = somar(dataToRender, (d) => d.vendas);
    const ticket = totalVendas > 0 ? revenueTrend.value / totalVendas : null;
    const totalCmv = somar(dataToRender, (d) => d.cmv);
    const margemContribuicao =
        totalCmv > 0 && receitaLiquida > 0 ? ((receitaLiquida - totalCmv) / receitaLiquida) * 100 : null;

    const quartoCartao =
        ticket !== null
            ? `<div class="bg-white rounded-lg shadow p-6"><p class="text-sm text-gray-500">Ticket Médio</p><div class="flex items-baseline space-x-2"><p class="text-2xl font-semibold">${formatCurrency(ticket)}</p></div><p class="text-xs text-gray-400">${totalVendas.toLocaleString('pt-BR')} vendas no período</p></div>`
            : `<div class="bg-white rounded-lg shadow p-6"><p class="text-sm text-gray-500">Margem Média</p><div class="flex items-baseline space-x-2"><p class="text-2xl font-semibold">${margin.toFixed(1)}%</p></div><p class="text-xs text-gray-400">no período selecionado</p></div>`;

    const cartaoMargem =
        ticket !== null
            ? `<div class="bg-white rounded-lg shadow p-6"><p class="text-sm text-gray-500">Margem Média</p><div class="flex items-baseline space-x-2"><p class="text-2xl font-semibold">${margin.toFixed(1)}%</p></div><p class="text-xs text-gray-400">no período selecionado</p></div>`
            : '';

    const cartaoContribuicao =
        margemContribuicao !== null
            ? `<div class="bg-white rounded-lg shadow p-6"><p class="text-sm text-gray-500">Margem de Contribuição</p><div class="flex items-baseline space-x-2"><p class="text-2xl font-semibold">${margemContribuicao.toFixed(1)}%</p></div><p class="text-xs text-gray-400">depois da mercadoria (${formatCurrency(totalCmv)})</p></div>`
            : '';

    document.getElementById('summary-cards').innerHTML = `
        <div class="bg-white rounded-lg shadow p-6"><p class="text-sm text-gray-500">Receita Total</p><div class="flex items-baseline space-x-2"><p class="text-2xl font-semibold">${formatCurrency(revenueTrend.value)}</p>${renderTrend(revenueTrend)}</div>${notaTaxas}</div>
        <div class="bg-white rounded-lg shadow p-6"><p class="text-sm text-gray-500">Despesas Totais</p><div class="flex items-baseline space-x-2"><p class="text-2xl font-semibold">${formatCurrency(expensesTrend.value)}</p>${renderTrend(expensesTrend, false)}</div><p class="text-xs text-gray-400">vs. período anterior</p></div>
        <div class="bg-white rounded-lg shadow p-6"><p class="text-sm text-gray-500">Lucro Líquido</p><div class="flex items-baseline space-x-2"><p class="text-2xl font-semibold">${formatCurrency(profitTrend.value)}</p>${renderTrend(profitTrend)}</div><p class="text-xs text-gray-400">vs. período anterior</p></div>
        ${quartoCartao}${cartaoMargem}${cartaoContribuicao}`;

    renderizarMetas(dataToRender, revenueTrend.value, margin);
    renderizarProjecao(dataToRender);

    // ---- Tabela (com ordenação e marcação de anomalia) ----
    const cabecalho = document.getElementById('main-table-head');
    cabecalho.innerHTML =
        COLUNAS_TABELA.map((col) => {
            const ativa = ordenacao.coluna === col.chave;
            const seta = ativa ? (ordenacao.crescente ? ' ▲' : ' ▼') : '';
            return `<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-800" onclick="ordenarPor('${col.chave}')" title="Ordenar por ${escapeHtml(col.rotulo)}">${escapeHtml(col.rotulo)}${seta}</th>`;
        }).join('') +
        '<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>';

    const colunaAtiva = COLUNAS_TABELA.find((c) => c.chave === ordenacao.coluna) || COLUNAS_TABELA[0];
    const linhas = [...dataToRender].sort((a, b) => {
        const diff = colunaAtiva.valor(a) - colunaAtiva.valor(b);
        return ordenacao.crescente ? diff : -diff;
    });

    const tbody = document.getElementById('main-table-body');
    tbody.innerHTML = linhas
        .map((item) => {
            const originalIndex = financialData.findIndex((d) => d.month === item.month);
            const grossIncome = getGrossIncome(item);
            const profit = getProfit(item);
            const margemItem = getMargin(item);
            const anomalia = anomalias[item.month];
            const marca = anomalia
                ? ` <i class="fas fa-exclamation-triangle text-yellow-500" title="Margem ${anomalia.direcao} do padrão do período (${anomalia.desvios.toFixed(1)} desvios da média de ${anomalia.media.toFixed(1)}%)"></i>`
                : '';
            const anual = variacaoAnual(item, financialData);
            const notaAnual = anual
                ? `<span class="block text-xs ${anual.variacao >= 0 ? 'text-green-600' : 'text-red-600'}">${anual.variacao >= 0 ? '+' : ''}${anual.variacao.toFixed(1)}% vs ${escapeHtml(anual.anterior.month)}</span>`
                : '';
            return `<tr><td class="px-6 py-4 text-sm font-medium text-gray-900">${escapeHtml(item.month)}${marca}</td><td class="px-6 py-4 text-sm text-gray-500">${formatCurrency(grossIncome)}${notaAnual}</td><td class="px-6 py-4 text-sm text-gray-500">${formatCurrency(item.expenses)}</td><td class="px-6 py-4 text-sm font-medium ${profit < 0 ? 'text-red-600' : 'text-green-600'}">${profit < 0 ? '<i class="fas fa-arrow-down mr-1" aria-hidden="true"></i><span class="sr-only">Prejuízo:</span>' : ''}${formatCurrency(profit)}</td><td class="px-6 py-4 text-sm font-medium ${margemItem < 10 ? 'text-red-600' : 'text-green-600'}">${margemItem < 10 ? '<i class="fas fa-triangle-exclamation mr-1" aria-hidden="true"></i><span class="sr-only">Margem baixa:</span>' : ''}${margemItem.toFixed(1)}%</td><td class="px-6 py-4 text-sm font-medium whitespace-nowrap"><button onclick="openModal(${originalIndex})" class="text-indigo-600 hover:text-indigo-900 mr-3" aria-label="Editar ${escapeHtml(item.month)}"><i class="fas fa-edit"></i></button><button onclick="deleteData(${originalIndex})" class="text-red-600 hover:text-red-900" aria-label="Excluir ${escapeHtml(item.month)}"><i class="fas fa-trash"></i></button></td></tr>`;
        })
        .join('');

    updateCharts(dataToRender);
    populateHighlights(dataToRender);
    generateDynamicInsights(dataToRender, revenueTrend, anomalias);
    populateMonthTabs(dataToRender);
    if (dataToRender.length > 0) {
        const firstTab = document.querySelector('.month-tab');
        showMonthAnalysis(firstTab, dataToRender[0].month);
    }
}

// ---- Metas (item 14) ----
function renderizarMetas(dados, receitaPeriodo, margemPeriodo) {
    const caixa = document.getElementById('goal-progress');
    if (!config.metaReceita && !config.metaMargem) {
        caixa.innerHTML = '';
        return;
    }
    if (dados.length === 0) {
        caixa.innerHTML = '';
        return;
    }

    const barra = (rotulo, atual, meta, texto) => {
        const pct = meta > 0 ? Math.min(200, (atual / meta) * 100) : 0;
        const cor = pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-red-500';
        return `
            <div class="flex-1 basis-full sm:basis-64">
                <div class="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-gray-600 mb-1">
                    <span>${escapeHtml(rotulo)}</span><span class="font-medium text-gray-800">${escapeHtml(texto)}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="${cor} h-2 rounded-full" style="width: ${Math.min(100, pct)}%"></div>
                </div>
            </div>`;
    };

    let html = '<div class="bg-white rounded-lg shadow p-4 flex flex-wrap gap-6">';
    if (config.metaReceita > 0) {
        // A meta é mensal, então é multiplicada pelos meses do período.
        const metaPeriodo = config.metaReceita * dados.length;
        const pct = metaPeriodo > 0 ? (receitaPeriodo / metaPeriodo) * 100 : 0;
        html += barra(
            `Meta de receita — ${dados.length} mês(es) × ${formatCurrency(config.metaReceita)}`,
            receitaPeriodo,
            metaPeriodo,
            `${pct.toFixed(0)}% de ${formatCurrency(metaPeriodo)}`,
        );
    }
    if (config.metaMargem > 0) {
        html += barra(
            `Meta de margem`,
            margemPeriodo,
            config.metaMargem,
            `${margemPeriodo.toFixed(1)}% de ${config.metaMargem.toFixed(1)}%`,
        );
    }
    caixa.innerHTML = html + '</div>';
}

// ============================================================
// COMPARAÇÃO ENTRE DOIS PERÍODOS (item 25)
// ============================================================
function alternarComparacao() {
    const painel = document.getElementById('compare-panel');
    const botao = document.getElementById('compare-toggle');
    const abrindo = painel.classList.contains('hidden');
    painel.classList.toggle('hidden', !abrindo);
    botao.textContent = abrindo ? 'Ocultar' : 'Mostrar';
    if (abrindo) popularSeletoresComparacao();
}

function popularSeletoresComparacao() {
    const opcoes = financialData
        .map((d) => `<option value="${escapeHtml(d.month)}">${escapeHtml(d.month)}</option>`)
        .join('');
    ['compare-a-start', 'compare-a-end', 'compare-b-start', 'compare-b-end'].forEach((id) => {
        document.getElementById(id).innerHTML = opcoes;
    });
    if (financialData.length === 0) return;
    const n = financialData.length;
    const meio = Math.floor(n / 2);
    // Padrão: primeira metade do histórico contra a segunda.
    document.getElementById('compare-a-start').value = financialData[0].month;
    document.getElementById('compare-a-end').value = financialData[Math.max(0, meio - 1)].month;
    document.getElementById('compare-b-start').value = financialData[Math.min(meio, n - 1)].month;
    document.getElementById('compare-b-end').value = financialData[n - 1].month;
}

function compararPeriodos() {
    const a = fatiarPeriodo(
        financialData,
        document.getElementById('compare-a-start').value,
        document.getElementById('compare-a-end').value,
    );
    const b = fatiarPeriodo(
        financialData,
        document.getElementById('compare-b-start').value,
        document.getElementById('compare-b-end').value,
    );
    const destino = document.getElementById('compare-result');
    if (a.length === 0 || b.length === 0) {
        destino.innerHTML = '<p class="text-sm text-red-600">Selecione meses válidos nos dois períodos.</p>';
        return;
    }

    const metricas = [
        { rotulo: 'Receita bruta', fn: getGrossIncome, moeda: true, maiorMelhor: true },
        { rotulo: 'Receita líquida', fn: getNetIncome, moeda: true, maiorMelhor: true },
        { rotulo: 'Despesas', fn: (d) => d.expenses, moeda: true, maiorMelhor: false },
        { rotulo: 'Lucro', fn: getProfit, moeda: true, maiorMelhor: true },
    ];

    const linhas = metricas
        .map((m) => {
            const va = somar(a, m.fn),
                vb = somar(b, m.fn);
            // Compara a média mensal: períodos de tamanhos diferentes ficam comparáveis.
            const ma = va / a.length,
                mb = vb / b.length;
            const variacao = ma !== 0 ? ((mb - ma) / Math.abs(ma)) * 100 : mb > 0 ? 100 : 0;
            const bom = m.maiorMelhor ? variacao >= 0 : variacao <= 0;
            return `<tr>
            <td class="px-3 py-2 text-sm text-gray-700">${escapeHtml(m.rotulo)}</td>
            <td class="px-3 py-2 text-sm text-right">${formatCurrency(ma)}</td>
            <td class="px-3 py-2 text-sm text-right">${formatCurrency(mb)}</td>
            <td class="px-3 py-2 text-sm text-right font-medium ${bom ? 'text-green-600' : 'text-red-600'}">${variacao >= 0 ? '+' : ''}${variacao.toFixed(1)}%</td>
        </tr>`;
        })
        .join('');

    const margemA = somar(a, getNetIncome) > 0 ? (somar(a, getProfit) / somar(a, getNetIncome)) * 100 : 0;
    const margemB = somar(b, getNetIncome) > 0 ? (somar(b, getProfit) / somar(b, getNetIncome)) * 100 : 0;

    destino.innerHTML = `
        <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50"><tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Média mensal</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">A: ${escapeHtml(a[0].month)}–${escapeHtml(a[a.length - 1].month)} <span class="font-normal">(${a.length}m)</span></th>
                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">B: ${escapeHtml(b[0].month)}–${escapeHtml(b[b.length - 1].month)} <span class="font-normal">(${b.length}m)</span></th>
                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Variação</th>
            </tr></thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${linhas}
                <tr>
                    <td class="px-3 py-2 text-sm text-gray-700">Margem</td>
                    <td class="px-3 py-2 text-sm text-right">${margemA.toFixed(1)}%</td>
                    <td class="px-3 py-2 text-sm text-right">${margemB.toFixed(1)}%</td>
                    <td class="px-3 py-2 text-sm text-right font-medium ${margemB >= margemA ? 'text-green-600' : 'text-red-600'}">${margemB >= margemA ? '+' : ''}${(margemB - margemA).toFixed(1)} p.p.</td>
                </tr>
            </tbody>
        </table>
        </div>
        <p class="mt-3 text-xs text-gray-500">Os valores são a média por mês de cada período, para que recortes de tamanhos diferentes possam ser comparados.</p>`;
}

// ---- Projeção do mês corrente (item 16) ----
function renderizarProjecao(dados) {
    const caixa = document.getElementById('projection-note');
    const mesAtual = dados.find((d) => d.month === mesCorrenteTexto());
    const proj = projecaoDoMes(mesAtual);
    if (!proj) {
        caixa.innerHTML = '';
        return;
    }
    caixa.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
            <strong>${escapeHtml(mesAtual.month)} ainda está em andamento</strong>
            — ${proj.diasCorridos} de ${proj.diasNoMes} dias lançados.
            No ritmo atual o mês fecharia com receita de <strong>${formatCurrency(proj.receita)}</strong>,
            despesa de <strong>${formatCurrency(proj.despesa)}</strong>
            e lucro de <strong>${formatCurrency(proj.lucro)}</strong>.
            <span class="block text-xs text-gray-500 mt-1">Estimativa por regra de três sobre os dias decorridos; não considera sazonalidade dentro do mês.</span>
        </div>`;
}

// Nova seção de configuração de gráficos
const chartColors = {
    blue: '#3B82F6',
    red: '#EF4444',
    green: '#10B981',
    purple: '#8B5CF6',
    orange: '#F59E0B',
    grid: '#e5e7eb',
    text: '#6b7280',
    tooltip: '#111827',
};

// As bibliotecas vêm de CDN. Em conexão móvel lenta, com economia de dados
// ou bloqueador de anúncios elas podem não carregar — sem esta proteção o
// erro interrompe o script e a página inteira (tabela, adicionar, backup)
// deixa de funcionar.
const chartsAvailable = typeof Chart !== 'undefined';

if (chartsAvailable) {
    Chart.defaults.font.family = "'Segoe UI', 'Roboto', 'sans-serif'";
    Chart.defaults.plugins.legend.position = 'bottom';
    Chart.defaults.plugins.tooltip.backgroundColor = chartColors.tooltip;
    Chart.defaults.plugins.tooltip.titleFont = { size: 14, weight: 'bold' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 4;
    if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);
}

// Abrevia valores grandes nos eixos: em 390px "R$ 138.164,23" não cabe (item 33).
function abreviarValor(valor) {
    const n = Math.abs(valor);
    if (n >= 1000000) return `R$ ${(valor / 1000000).toFixed(1).replace('.', ',')} mi`;
    if (n >= 1000) return `R$ ${Math.round(valor / 1000)} mil`;
    return formatCurrency(valor);
}

function telaPequena() {
    return window.innerWidth < 640;
}

function updateCharts(data) {
    if (!chartsAvailable) return;
    const tema = coresDoTema();
    const compacto = telaPequena();
    const eixoValor = {
        grid: { color: tema.grade },
        ticks: { color: tema.texto, callback: (v) => (compacto ? abreviarValor(v) : formatCurrency(v)) },
    };
    const eixoCategoria = { grid: { display: false }, ticks: { color: tema.texto } };
    Chart.defaults.color = tema.texto;
    const labels = data.map((d) => d.month);
    const ctx = document.getElementById('profitMarginChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    if (revenueExpensesChart) revenueExpensesChart.destroy();
    revenueExpensesChart = new Chart(document.getElementById('revenueExpensesChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Receita Bruta',
                    data: data.map((d) => getGrossIncome(d)),
                    backgroundColor: chartColors.blue,
                    borderRadius: 4,
                },
                {
                    label: 'Despesas',
                    data: data.map((d) => d.expenses),
                    backgroundColor: chartColors.red,
                    borderRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: eixoCategoria, y: eixoValor },
            plugins: { datalabels: { display: false } },
        },
    });

    if (profitMarginChart) profitMarginChart.destroy();
    const margens = data.map(getMargin);
    const conjuntos = [
        {
            label: 'Margem de Lucro (%)',
            data: margens,
            borderColor: chartColors.green,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: chartColors.green,
        },
    ];
    // Média móvel (item 18): só faz sentido com histórico suficiente.
    if (data.length >= 3) {
        conjuntos.push({
            label: 'Média móvel (3 meses)',
            data: mediaMovel(margens, 3),
            borderColor: chartColors.purple,
            borderDash: [6, 4],
            fill: false,
            tension: 0.4,
            pointRadius: 0,
        });
    }
    profitMarginChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: conjuntos },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: eixoCategoria,
                y: { grid: { color: tema.grade }, ticks: { color: tema.texto, callback: (v) => `${v.toFixed(0)}%` } },
            },
            plugins: { datalabels: { display: false } },
        },
    });

    // Composição das despesas por categoria (item 17)
    const categorias = agregarCategorias(data);
    const nomes = Object.keys(categorias).sort((a, b) => categorias[b] - categorias[a]);
    const cartaoCategorias = document.getElementById('expense-categories-card');
    if (expenseCategoriesChart) {
        expenseCategoriesChart.destroy();
        expenseCategoriesChart = null;
    }
    if (nomes.length > 0) {
        cartaoCategorias.classList.remove('hidden');
        const paleta = [
            chartColors.blue,
            chartColors.red,
            chartColors.green,
            chartColors.purple,
            chartColors.orange,
            '#6B7280',
            '#DB2777',
            '#0891B2',
        ];
        expenseCategoriesChart = new Chart(document.getElementById('expenseCategoriesChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: nomes.map((n) => n.charAt(0).toUpperCase() + n.slice(1)),
                datasets: [
                    {
                        label: 'Despesa',
                        data: nomes.map((n) => categorias[n]),
                        backgroundColor: nomes.map((_, i) => paleta[i % paleta.length]),
                        borderRadius: 4,
                    },
                ],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { ...eixoValor, ticks: { ...eixoValor.ticks } }, y: eixoCategoria },
                plugins: {
                    legend: { display: false },
                    datalabels: { display: false },
                    tooltip: { callbacks: { label: (c) => formatCurrency(c.raw) } },
                },
            },
        });
    } else {
        cartaoCategorias.classList.add('hidden');
    }

    if (paymentMethodsChart) paymentMethodsChart.destroy();
    paymentMethodsChart = new Chart(document.getElementById('paymentMethodsChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Dinheiro', 'Cartão', 'Pix', 'iFood'],
            datasets: [
                {
                    data: [
                        data.reduce((s, d) => s + d.cash, 0),
                        data.reduce((s, d) => s + d.card, 0),
                        data.reduce((s, d) => s + d.pix, 0),
                        data.reduce((s, d) => s + d.ifood, 0),
                    ],
                    backgroundColor: [chartColors.green, chartColors.blue, chartColors.purple, chartColors.orange],
                    spacing: 4,
                    borderWidth: 0,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                datalabels: {
                    formatter: (value, ctx) => {
                        let sum = ctx.chart.getDatasetMeta(0).total;
                        if (sum === 0) return '0%';
                        let percentage = ((value * 100) / sum).toFixed(1) + '%';
                        return percentage;
                    },
                    color: '#fff',
                    font: { weight: 'bold' },
                },
            },
        },
    });

    if (paymentTrendsChart) paymentTrendsChart.destroy();
    paymentTrendsChart = new Chart(document.getElementById('paymentTrendsChart').getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Dinheiro', data: data.map((d) => d.cash), borderColor: chartColors.green, tension: 0.4 },
                { label: 'Cartão', data: data.map((d) => d.card), borderColor: chartColors.blue, tension: 0.4 },
                { label: 'Pix', data: data.map((d) => d.pix), borderColor: chartColors.purple, tension: 0.4 },
                { label: 'iFood', data: data.map((d) => d.ifood), borderColor: chartColors.orange, tension: 0.4 },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: eixoCategoria, y: eixoValor },
            plugins: { datalabels: { display: false } },
        },
    });
}

function populateHighlights(data) {
    const section = document.getElementById('highlights-section');
    if (data.length === 0) {
        section.innerHTML =
            '<p class="text-center text-gray-500 col-span-4">Selecione um período para ver os destaques.</p>';
        return;
    }
    let bestMonth = data.reduce((p, c) => (getProfit(c) > getProfit(p) ? c : p));
    let worstMonth = data.reduce((p, c) => (getProfit(c) < getProfit(p) ? c : p));
    let highestRevenueMonth = data.reduce((p, c) => (getGrossIncome(c) > getGrossIncome(p) ? c : p));
    let bestMarginMonth = data.reduce((p, c) =>
        getProfit(c) / getGrossIncome(c) > getProfit(p) / getGrossIncome(p) ? c : p,
    );
    const bestMarginValue =
        getGrossIncome(bestMarginMonth) > 0 ? (getProfit(bestMarginMonth) / getGrossIncome(bestMarginMonth)) * 100 : 0;

    section.innerHTML = `
        <div class="bg-white rounded-lg shadow p-6 border-l-4 border-green-500"> <p class="text-sm text-gray-500">Melhor Mês (Lucro)</p><p class="text-lg font-semibold">${escapeHtml(bestMonth.month)}</p><p class="text-sm text-green-600">${formatCurrency(getProfit(bestMonth))}</p></div>
        <div class="bg-white rounded-lg shadow p-6 border-l-4 border-red-500"><p class="text-sm text-gray-500">Pior Mês (Lucro)</p><p class="text-lg font-semibold">${escapeHtml(worstMonth.month)}</p><p class="text-sm text-red-600">${formatCurrency(getProfit(worstMonth))}</p></div>
        <div class="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500"><p class="text-sm text-gray-500">Maior Receita</p><p class="text-lg font-semibold">${escapeHtml(highestRevenueMonth.month)}</p><p class="text-sm text-blue-600">${formatCurrency(getGrossIncome(highestRevenueMonth))}</p></div>
        <div class="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500"><p class="text-sm text-gray-500">Melhor Margem</p><p class="text-lg font-semibold">${escapeHtml(bestMarginMonth.month)}</p><p class="text-sm text-purple-600">${bestMarginValue.toFixed(1)}%</p></div>`;
}

function generateDynamicInsights(data, trend, anomalias) {
    const list = document.getElementById('insights-list');
    list.innerHTML = '';

    if (data.length < 1) {
        list.innerHTML =
            '<li><i class="fas fa-info-circle mr-2 text-blue-500"></i> Selecione um período para gerar insights.</li>';
        return;
    }

    const bestMonth = data.reduce((p, c) => (getProfit(c) > getProfit(p) ? c : p));
    const paymentTotals = {
        Dinheiro: data.reduce((s, d) => s + d.cash, 0),
        Cartão: data.reduce((s, d) => s + d.card, 0),
        Pix: data.reduce((s, d) => s + d.pix, 0),
        iFood: data.reduce((s, d) => s + d.ifood, 0),
    };
    const dominantPayment = Object.keys(paymentTotals).reduce((a, b) => (paymentTotals[a] > paymentTotals[b] ? a : b));

    // Insight 1: Best Month
    list.innerHTML += `<li><i class="fas fa-check-circle mr-2 text-green-500"></i> O mês de maior destaque no período foi <strong>${escapeHtml(bestMonth.month)}</strong>, com um lucro de <strong>${formatCurrency(getProfit(bestMonth))}</strong>.</li>`;

    // Insight 2: Dominant Payment
    list.innerHTML += `<li><i class="fas fa-check-circle mr-2 text-green-500"></i> <strong>${escapeHtml(dominantPayment)}</strong> foi o método de pagamento mais significativo, representando <strong>${formatCurrency(paymentTotals[dominantPayment])}</strong> em vendas.</li>`;

    // Insight 3: Trend
    if (trend.change !== 0) {
        list.innerHTML += `<li><i class="fas fa-chart-line mr-2 text-blue-500"></i> A receita do período teve uma <strong>${trend.change > 0 ? 'alta' : 'baixa'} de ${Math.abs(trend.change).toFixed(1)}%</strong> em comparação com o período anterior.</li>`;
    }

    // Insight 4: Unprofitable months
    const unprofitableMonths = data.filter((d) => getProfit(d) < 0);
    if (unprofitableMonths.length > 0) {
        list.innerHTML += `<li><i class="fas fa-exclamation-triangle mr-2 text-red-500"></i> Atenção: O(s) mês(es) de <strong>${escapeHtml(unprofitableMonths.map((m) => m.month).join(', '))}</strong> operou com prejuízo.</li>`;
    }

    // Insight 5: comparação ano a ano (item 15)
    const comparaveis = data
        .map((item) => ({ item, anual: variacaoAnual(item, financialData) }))
        .filter((x) => x.anual);
    if (comparaveis.length > 0) {
        const soma = comparaveis.reduce((s, x) => s + x.anual.variacao, 0) / comparaveis.length;
        const sinal = soma >= 0 ? 'acima' : 'abaixo';
        list.innerHTML += `<li><i class="fas fa-calendar-alt mr-2 text-indigo-500"></i> Contra o mesmo período do ano anterior (${comparaveis.length} mês/meses comparáveis), a receita está <strong>${Math.abs(soma).toFixed(1)}% ${sinal}</strong>.</li>`;
    }

    // Insight 6: meses fora do padrão (item 19)
    const foraDoPadrao = Object.keys(anomalias || {});
    if (foraDoPadrao.length > 0) {
        const descricoes = foraDoPadrao.map((m) => `${m} (${anomalias[m].margem.toFixed(1)}%)`).join(', ');
        list.innerHTML += `<li><i class="fas fa-flag mr-2 text-yellow-500"></i> Margem fora do padrão em <strong>${escapeHtml(descricoes)}</strong>, contra uma média de ${Object.values(anomalias)[0].media.toFixed(1)}% no período. Vale conferir o lançamento.</li>`;
    }

    // Insight 7: composição das despesas (item 10/11)
    const categorias = agregarCategorias(data);
    const totalCategorias = Object.values(categorias).reduce((s, v) => s + v, 0);
    if (totalCategorias > 0) {
        const maior = Object.keys(categorias).reduce((a, b) => (categorias[a] > categorias[b] ? a : b));
        const fatia = (categorias[maior] / totalCategorias) * 100;
        list.innerHTML += `<li><i class="fas fa-tags mr-2 text-blue-500"></i> A maior despesa do período é <strong>${escapeHtml(maior)}</strong>, com ${formatCurrency(categorias[maior])} — ${fatia.toFixed(1)}% do total classificado.</li>`;
    }
}

// Junta o detalhamento de despesas de vários meses (item 10).

function populateMonthTabs(data) {
    const tabsContainer = document.getElementById('month-tabs');
    tabsContainer.innerHTML = '';
    // data-month + delegação em vez de interpolar o nome dentro do
    // onclick: um mês vindo de backup adulterado não vira código.
    data.forEach((item) => {
        tabsContainer.innerHTML += `<button type="button" data-month="${escapeHtml(item.month)}" class="month-tab whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">${escapeHtml(item.month)}</button>`;
    });
}

document.getElementById('month-tabs').addEventListener('click', (e) => {
    const aba = e.target.closest('.month-tab');
    if (aba) showMonthAnalysis(aba, aba.dataset.month);
});

function showMonthAnalysis(element, month) {
    document.querySelectorAll('.month-tab').forEach((tab) => tab.classList.remove('active'));
    if (element) element.classList.add('active');

    const monthData = financialData.find((d) => d.month === month);
    const contentDiv = document.getElementById('monthAnalysisContent');
    if (!monthData) {
        contentDiv.innerHTML = '';
        return;
    }

    const gross = getGrossIncome(monthData);
    const profit = getProfit(monthData);
    const margin = gross > 0 ? (profit / gross) * 100 : 0;

    // Gerar sugestões dinâmicas
    let suggestions = '';
    if (margin < 10 && profit > 0) {
        suggestions = `<li><i class="fas fa-arrow-right text-yellow-500 mt-1 mr-2"></i><span>A margem de lucro está baixa. Analise os custos variáveis e a precificação para melhorá-la.</span></li>`;
    } else if (profit <= 0) {
        suggestions = `<li><i class="fas fa-arrow-right text-red-500 mt-1 mr-2"></i><span>Este mês operou com prejuízo. É crucial revisar todas as despesas e estratégias de venda imediatamente.</span></li>`;
    } else if (margin > 35) {
        suggestions = `<li><i class="fas fa-arrow-right text-green-500 mt-1 mr-2"></i><span>Excelente margem de lucro! Identifique o que funcionou neste mês para replicar nos próximos.</span></li>`;
    } else {
        suggestions = `<li><i class="fas fa-arrow-right text-blue-500 mt-1 mr-2"></i><span>O desempenho foi sólido. Continue monitorando os custos para manter a boa performance.</span></li>`;
    }

    // Indicadores extras do mês, quando os dados existem.
    const linhasExtras = [];
    const taxasMes = getFees(monthData);
    if (taxasMes > 0) {
        linhasExtras.push(['Taxas retidas', formatCurrency(taxasMes), 'text-red-600']);
        linhasExtras.push(['Receita líquida', formatCurrency(getNetIncome(monthData)), 'text-blue-600']);
    }
    const contribuicao = getContributionMargin(monthData);
    if (contribuicao !== null) {
        linhasExtras.push(['Margem de contribuição', `${contribuicao.toFixed(1)}%`, 'text-gray-800']);
    }
    const ticketMes = getTicket(monthData);
    if (ticketMes !== null) {
        linhasExtras.push([
            `Ticket médio (${monthData.vendas.toLocaleString('pt-BR')} vendas)`,
            formatCurrency(ticketMes),
            'text-gray-800',
        ]);
    }
    const anual = variacaoAnual(monthData, financialData);
    if (anual) {
        linhasExtras.push([
            `vs ${anual.anterior.month}`,
            `${anual.variacao >= 0 ? '+' : ''}${anual.variacao.toFixed(1)}%`,
            anual.variacao >= 0 ? 'text-green-600' : 'text-red-600',
        ]);
    }
    const blocoExtras = linhasExtras
        .map(
            ([rotulo, valor, cor]) => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span class="font-medium text-gray-700">${escapeHtml(rotulo)}</span>
            <span class="font-bold ${cor}">${escapeHtml(valor)}</span>
        </div>`,
        )
        .join('');

    // Detalhamento das despesas por categoria (item 10).
    const catsMes = Object.keys(monthData.categorias || {}).sort(
        (a, b) => monthData.categorias[b] - monthData.categorias[a],
    );
    const blocoCategorias =
        catsMes.length === 0
            ? ''
            : `
        <h3 class="text-lg font-semibold text-gray-800 mt-6 mb-3">Despesas por Categoria</h3>
        <ul class="bg-gray-50 rounded-lg p-4">${catsMes
            .map(
                (c, i) => `
            <li class="flex justify-between items-center py-2 ${i < catsMes.length - 1 ? 'border-b' : ''}">
                <span class="text-gray-600">${escapeHtml(c.charAt(0).toUpperCase() + c.slice(1))}</span>
                <span class="font-medium">${formatCurrency(monthData.categorias[c])}</span>
            </li>`,
            )
            .join('')}</ul>`;

    const paymentBreakdown = `
        <li class="flex justify-between items-center py-2 border-b"><span class="text-gray-600">Dinheiro</span><span class="font-medium">${formatCurrency(monthData.cash)}</span></li>
        <li class="flex justify-between items-center py-2 border-b"><span class="text-gray-600">Cartão</span><span class="font-medium">${formatCurrency(monthData.card)}</span></li>
        <li class="flex justify-between items-center py-2 border-b"><span class="text-gray-600">Pix</span><span class="font-medium">${formatCurrency(monthData.pix)}</span></li>
        <li class="flex justify-between items-center py-2"><span class="text-gray-600">iFood</span><span class="font-medium">${formatCurrency(monthData.ifood)}</span></li>
    `;

    contentDiv.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3">${escapeHtml(monthData.month)} - Resumo</h3>
                <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span class="font-medium text-gray-700">Receita Bruta</span>
                        <span class="font-bold text-blue-600">${formatCurrency(gross)}</span>
                    </div>
                     <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span class="font-medium text-gray-700">Despesas</span>
                        <span class="font-bold text-red-600">${formatCurrency(monthData.expenses)}</span>
                    </div>
                     <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span class="font-medium text-gray-700">Lucro Líquido</span>
                        <span class="font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}">${formatCurrency(profit)}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span class="font-medium text-gray-700">Margem de Lucro</span>
                        <span class="font-bold ${margin < 10 ? 'text-red-600' : margin > 35 ? 'text-green-600' : 'text-gray-800'}">${margin.toFixed(1)}%</span>
                    </div>
                    ${blocoExtras}
                </div>
            </div>
            <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3">Detalhamento das Entradas</h3>
                <ul class="bg-gray-50 rounded-lg p-4">${paymentBreakdown}</ul>
                ${blocoCategorias}

                <h3 class="text-lg font-semibold text-gray-800 mt-6 mb-3">Sugestões</h3>
                <ul class="space-y-2">${suggestions}</ul>
            </div>
        </div>
    `;
}

// #############################################################
// # 6. FUNÇÕES DE BACKUP (NOVO)
// #############################################################

async function exportBackup() {
    if (financialData.length === 0) {
        showToast('Não há dados para exportar.', 'error');
        return;
    }

    // Formato versionado (item 3): permite mudar o modelo no futuro sem
    // quebrar arquivos antigos. A importação continua aceitando a lista
    // pura gerada pelas versões anteriores.
    const pacote = {
        formato: 'relatorio-financeiro',
        versao: FORMATO_BACKUP,
        exportadoEm: new Date().toISOString(),
        totalRegistros: financialData.length,
        somaReceitaBruta: Number(somar(financialData, getGrossIncome).toFixed(2)),
        somaDespesas: Number(somar(financialData, (d) => d.expenses).toFixed(2)),
        config,
        dados: financialData,
    };
    const dataStr = JSON.stringify(pacote, null, 2);
    const filename = `backup_financeiro_${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([dataStr], { type: 'application/json' });

    // No celular o compartilhamento nativo é bem mais confiável do que o
    // download por link: permite salvar no Drive, Arquivos, WhatsApp etc.
    try {
        if (navigator.canShare && typeof File === 'function') {
            const file = new File([blob], filename, { type: 'application/json' });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Backup Financeiro' });
                return;
            }
        }
    } catch (err) {
        if (err && err.name === 'AbortError') return; // usuário cancelou
        // qualquer outro erro: segue para o download tradicional
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    // O link precisa estar no documento e a URL só pode ser liberada depois
    // que o download começa — revogar na hora trunca o arquivo no mobile.
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
    }, 5000);
    registrarBackupFeito();
    showToast(`Backup gerado: ${filename}`, 'success');
}

// #############################################################
// # 6.1 IMPORTAÇÃO DO BACKUP DO CONTROLE FINANCEIRO (CAIXA)
// #############################################################
// O app de caixa exporta um JSON com três coleções: vendas
// (entradas por forma de pagamento e saídas de caixa), boletos
// (contas de fornecedor) e gastos_pessoais. Aqui esses
// lançamentos diários viram um registro por mês no formato do
// painel. Regras aplicadas, todas verificadas com dados reais:
//
//  - Receita  = vendas do tipo "entrada", agrupadas pela forma
//               de pagamento (dinheiro / cartão / pix).
//  - Despesas = saídas de caixa + boletos. Não há dupla
//               contagem: as saídas são compras miúdas do dia
//               (gelo, marmita), não pagamento de boleto.
//  - Gastos pessoais ficam de fora: são retiradas do dono, não
//               custo da loja.
//  - iFood não existe como forma separada naquele sistema (já
//               está dentro de cartão/dinheiro/pix), então a
//               coluna vem zerada para ser preenchida à mão.
//  - O mês corrente não entra: ele teria poucos dias de venda
//               contra boletos do mês inteiro, muitos com
//               vencimento futuro, e a margem sairia irreal.

// As formas de pagamento são configuráveis por loja, então além
// dos ids padrão o prefixo também é reconhecido — uma forma nova
// como "cartao_stone" continua caindo em cartão.

function importBackup(input) {
    const file = input.files && input.files[0];
    // Libera o input imediatamente para que o mesmo arquivo possa ser
    // escolhido de novo, inclusive quando a leitura falha.
    input.value = '';
    if (!file) return;

    const reader = new FileReader();

    reader.onerror = function () {
        showToast(
            'Não foi possível ler o arquivo. Se ele está no Google Drive ou iCloud, baixe para o aparelho antes de restaurar.',
            'error',
        );
    };

    reader.onload = function (e) {
        const conteudo = String(e.target.result || '');

        // CSV (item 23): detectado pela extensão ou pelo cabeçalho.
        const pareceCsv =
            /\.csv$/i.test(file.name) ||
            conteudo
                .slice(0, 200)
                .toLowerCase()
                .replace(/^\ufeff/, '')
                .startsWith('mês') ||
            conteudo
                .slice(0, 200)
                .toLowerCase()
                .replace(/^\ufeff/, '')
                .startsWith('"mês');
        if (pareceCsv) {
            const resultado = converterCsv(conteudo);
            if (resultado.erro) {
                showToast(`CSV inválido: ${resultado.erro}`, 'error');
                return;
            }
            if (resultado.registros.length === 0) {
                showToast('Nenhuma linha válida no CSV.', 'error');
                return;
            }
            const divergencias =
                resultado.ignoradas && resultado.ignoradas.length
                    ? [
                          `${resultado.ignoradas.length} linha(s) sem mês reconhecível foram ignoradas (linhas ${resultado.ignoradas.slice(0, 5).join(', ')}${resultado.ignoradas.length > 5 ? '…' : ''})`,
                      ]
                    : [];
            openRestoreModal(resultado.registros, 'csv', { divergencias });
            return;
        }

        let json;
        try {
            json = JSON.parse(conteudo);
        } catch (err) {
            showToast('O arquivo escolhido não é um backup válido (não é JSON nem CSV reconhecido).', 'error');
            return;
        }

        // Backup do app de caixa: converte os lançamentos diários em meses.
        if (pareceBackupDoCaixa(json)) {
            const convertido = converterBackupDoCaixa(json);
            if (convertido.registros.length === 0) {
                showToast('O backup do caixa não tem nenhum mês fechado para importar.', 'error');
                return;
            }
            openRestoreModal(convertido.registros.map(normalizeRecord), 'caixa', convertido);
            return;
        }

        // Aceita o formato versionado novo e a lista pura das versões antigas.
        let lista = json;
        let pacote = null;
        if (json && typeof json === 'object' && !Array.isArray(json) && Array.isArray(json.dados)) {
            pacote = json;
            lista = json.dados;
            if (Number(json.versao) > FORMATO_BACKUP) {
                showToast(
                    `Este backup foi gerado por uma versão mais nova do painel (formato ${json.versao}). Atualize a página antes de restaurar.`,
                    'error',
                );
                return;
            }
        }

        if (!Array.isArray(lista)) {
            showToast('Formato inválido: o arquivo deve conter uma lista de meses.', 'error');
            return;
        }
        if (!lista.every((item) => item && typeof item === 'object' && 'month' in item)) {
            showToast('Formato inválido: os dados não correspondem ao modelo financeiro.', 'error');
            return;
        }

        const records = lista.map(normalizeRecord).filter((r) => r.month);
        if (records.length === 0) {
            showToast('O backup não contém nenhum registro válido.', 'error');
            return;
        }

        // Conferência de integridade (item 7): o arquivo declara quantos
        // registros e quanto somam; se não bater, o usuário é avisado.
        const divergencias = [];
        if (pacote) {
            const perdidos = lista.length - records.length;
            if (typeof pacote.totalRegistros === 'number' && pacote.totalRegistros !== records.length) {
                divergencias.push(
                    `o arquivo declara ${pacote.totalRegistros} registro(s) e foram lidos ${records.length}`,
                );
            } else if (perdidos > 0) {
                divergencias.push(`${perdidos} registro(s) sem mês foram descartados`);
            }
            const conferir = (declarado, calculado, nome) => {
                if (typeof declarado !== 'number') return;
                if (Math.abs(declarado - calculado) > 0.01) {
                    divergencias.push(
                        `${nome} declarada (${formatCurrency(declarado)}) não bate com a lida (${formatCurrency(calculado)})`,
                    );
                }
            };
            conferir(pacote.somaReceitaBruta, somar(records, getGrossIncome), 'a receita bruta');
            conferir(
                pacote.somaDespesas,
                somar(records, (d) => d.expenses),
                'a despesa',
            );
        }

        openRestoreModal(records, 'painel', { divergencias, config: pacote ? pacote.config : null });
    };

    reader.readAsText(file);
}

function openRestoreModal(records, origem, detalhes) {
    pendingBackup = records;
    pendingBackupOrigem = origem || 'painel';
    pendingBackupConfig = detalhes && detalhes.config ? detalhes.config : null;

    const existing = new Set(financialData.map((d) => d.month.toLowerCase()));
    const novos = records.filter((r) => !existing.has(r.month.toLowerCase())).length;
    const repetidos = records.length - novos;

    let html = `O arquivo tem <strong>${records.length}</strong> registro(s): <strong>${novos}</strong> mês(es) que ainda não estão aqui e <strong>${repetidos}</strong> já existente(s). Neste aparelho há <strong>${financialData.length}</strong> mês(es) salvos.`;

    if (detalhes && detalhes.divergencias && detalhes.divergencias.length) {
        html += `<span class="block mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-900">`;
        html += `<strong>A conferência do arquivo não bateu:</strong><br>${detalhes.divergencias.map(escapeHtml).join('<br>')}`;
        html += `<br><span class="block mt-1">Isso indica arquivo truncado ou editado. Dá para continuar, mas confira os números depois.</span></span>`;
    }
    if (pendingBackupConfig) {
        html += `<span class="block mt-2 text-xs text-gray-500">As taxas e metas guardadas no arquivo também serão aplicadas.</span>`;
    }

    if (pendingBackupOrigem === 'caixa' && detalhes) {
        const periodo = records.length ? ` (${records[0].month} a ${records[records.length - 1].month})` : '';
        html += `<span class="block mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">`;
        html += `Backup do <strong>Controle Financeiro</strong>: lançamentos diários somados por mês${periodo}.`;
        if (detalhes.mesesIgnorados.length) {
            html += `<br>Mês em aberto fora da importação: <strong>${detalhes.mesesIgnorados.join(', ')}</strong>.`;
        }
        html += `<br>A coluna <strong>iFood fica zerada</strong> (naquele sistema ela já está dentro de cartão, dinheiro e pix) — preencha à mão depois pelo botão de editar.`;
        if (detalhes.totalPessoais > 0) {
            html += `<br>Gastos pessoais não entram como despesa da loja: <strong>${formatCurrency(detalhes.totalPessoais)}</strong> ignorados.`;
        }
        const sobras = Object.keys(detalhes.naoMapeadas || {});
        if (sobras.length) {
            const soma = sobras.reduce((s, k) => s + detalhes.naoMapeadas[k], 0);
            html += `<br><span class="text-red-600">Atenção: ${sobras.length} forma(s) de pagamento não reconhecida(s) — ${sobras.join(', ')} — somando ${formatCurrency(soma)} ficaram de fora da receita.</span>`;
        }
        html += `</span>`;
    }

    document.getElementById('restore-summary').innerHTML = html;
    document.getElementById('restore-modal').classList.remove('hidden');
    focarModal('restore-modal');
}

function closeRestoreModal() {
    pendingBackup = null;
    pendingBackupOrigem = 'painel';
    pendingBackupConfig = null;
    document.getElementById('restore-modal').classList.add('hidden');
}

function confirmRestore(mode) {
    if (!pendingBackup) {
        closeRestoreModal();
        return;
    }

    const backup = pendingBackup;
    const doCaixa = pendingBackupOrigem === 'caixa';
    let added = 0;
    let updated = 0;
    let ifoodPreservado = 0;
    let message;

    // Cópia automática + estado para desfazer, antes de mexer em qualquer coisa.
    guardarParaDesfazer(
        mode === 'replace' ? 'Substituição desfeita.' : 'Mesclagem desfeita.',
        mode === 'replace' ? 'antes de substituir tudo' : 'antes de mesclar backup',
    );

    if (pendingBackupConfig) {
        const c = pendingBackupConfig;
        config.taxaCartao = Math.min(100, Math.max(0, toNumber(c.taxaCartao)));
        config.taxaIfood = Math.min(100, Math.max(0, toNumber(c.taxaIfood)));
        config.metaReceita = Math.max(0, toNumber(c.metaReceita));
        config.metaMargem = Math.min(100, Math.max(0, toNumber(c.metaMargem)));
        salvarConfig();
    }

    if (mode === 'replace') {
        financialData = sortData(backup);
        message = `Backup restaurado: ${backup.length} registro(s).`;
    } else {
        const merged = financialData.slice();
        backup.forEach((record) => {
            const index = merged.findIndex((d) => d.month.toLowerCase() === record.month.toLowerCase());
            if (index === -1) {
                merged.push(record);
                added++;
            } else {
                // O backup do caixa nunca traz iFood nem número de vendas.
                // Sem isto, reimportar para pegar um mês novo zeraria o
                // que foi digitado à mão em todos os meses anteriores.
                if (doCaixa) {
                    const manual = {};
                    if (merged[index].ifood > 0) {
                        manual.ifood = merged[index].ifood;
                        ifoodPreservado++;
                    }
                    if (merged[index].vendas > 0) manual.vendas = merged[index].vendas;
                    if (Object.keys(manual).length) record = { ...record, ...manual };
                }
                merged[index] = record;
                updated++;
            }
        });
        financialData = sortData(merged);
        message = `Backup mesclado: ${added} mês(es) novo(s) e ${updated} atualizado(s).`;
        if (ifoodPreservado > 0) {
            message += ` O iFood digitado à mão foi mantido em ${ifoodPreservado} mês(es).`;
        }
    }

    const saved = saveData();
    updateDashboard(financialData);
    closeRestoreModal();
    if (saved) showToast(message, 'success');
}

// #############################################################
// # 7. INICIALIZAÇÃO
// #############################################################

document.addEventListener('DOMContentLoaded', () => {
    aplicarTemaSalvo();
    carregarConfig();
    prepararAcessibilidade();
    registrarServiceWorker();
    document.getElementById('app-version').textContent = APP_VERSAO;
    atualizarBotaoBloqueio();

    // Com bloqueio ativo nada é renderizado antes da senha.
    if (temCofre()) {
        abrirTelaDeBloqueio('abrir');
        return;
    }
    iniciarPainel();
});

function iniciarPainel() {
    loadData();
    updateDashboard(financialData);
    if (financialData.length > 0) {
        const firstTab = document.querySelector('.month-tab');
        showMonthAnalysis(firstTab, financialData[0].month);
    }
    checarLembreteDeBackup();
}

// Formulário da tela de bloqueio: cria a senha ou abre o painel.
document.getElementById('lock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const modal = document.getElementById('lock-modal');
    const modo = modal.dataset.modo;
    const senha = document.getElementById('lock-password').value;

    if (modo === 'definir') {
        if (senha.length < 4) {
            erroDeBloqueio('Use ao menos 4 caracteres.');
            return;
        }
        if (senha !== document.getElementById('lock-password-2').value) {
            erroDeBloqueio('As duas senhas não são iguais.');
            return;
        }
        try {
            const cofre = await cifrarDados(senha, financialData);
            localStorage.setItem(CHAVE_COFRE, JSON.stringify(cofre));
            localStorage.removeItem('financialReportData');
            senhaAtiva = senha;
            modal.classList.add('hidden');
            atualizarBotaoBloqueio();
            showToast('Bloqueio ativado. A senha será pedida ao abrir o painel.', 'success');
        } catch (err) {
            erroDeBloqueio('Não foi possível ativar o bloqueio neste navegador.');
        }
        return;
    }

    try {
        const cofre = JSON.parse(localStorage.getItem(CHAVE_COFRE));
        const dados = await decifrarDados(senha, cofre);
        senhaAtiva = senha;
        financialData = sortData((Array.isArray(dados) ? dados : []).map(normalizeRecord));
        modal.classList.add('hidden');
        updateDashboard(financialData);
        if (financialData.length > 0) {
            showMonthAnalysis(document.querySelector('.month-tab'), financialData[0].month);
        }
        checarLembreteDeBackup();
    } catch (err) {
        // AES-GCM falha a autenticação com senha errada: não há como distinguir
        // senha incorreta de arquivo corrompido, e não convém tentar.
        erroDeBloqueio('Senha incorreta.');
    }
});

// #############################################################
// # 8. TEMA CLARO / ESCURO (item 29)
// #############################################################

function aplicarTemaSalvo() {
    let escolha = null;
    try {
        escolha = localStorage.getItem('financialReportTheme');
    } catch (err) {
        escolha = null;
    }
    // Sem escolha explícita, segue a preferência do sistema.
    const escuro = escolha
        ? escolha === 'escuro'
        : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', escuro);
    atualizarBotaoTema(escuro);
}

function atualizarBotaoTema(escuro) {
    const botao = document.getElementById('theme-toggle');
    if (!botao) return;
    botao.innerHTML = `<i class="fas ${escuro ? 'fa-sun' : 'fa-moon'}"></i>`;
    botao.setAttribute('aria-label', escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro');
    botao.setAttribute('title', botao.getAttribute('aria-label'));
}

function alternarTema() {
    const escuro = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', escuro);
    try {
        localStorage.setItem('financialReportTheme', escuro ? 'escuro' : 'claro');
    } catch (err) {
        /* sem persistência */
    }
    atualizarBotaoTema(escuro);
    // Os gráficos são desenhados em canvas: precisam ser redesenhados no novo tema.
    updateDashboard(dadosVisiveis());
}

function coresDoTema() {
    const escuro = document.documentElement.classList.contains('dark');
    return {
        grade: escuro ? '#374151' : '#e5e7eb',
        texto: escuro ? '#9ca3af' : '#6b7280',
    };
}

// #############################################################
// # 9. ATALHOS DE PERÍODO (item 31)
// #############################################################

function aplicarAtalhoPeriodo(quantidade) {
    if (financialData.length === 0) return;
    let selecionados;
    if (quantidade === 'ano') {
        const ano = String(new Date().getFullYear());
        selecionados = financialData.filter((d) => d.month.split('/')[1] === ano);
        if (selecionados.length === 0) {
            showToast('Nenhum mês do ano corrente foi lançado ainda.', 'error');
            return;
        }
    } else if (quantidade === 'tudo') {
        selecionados = financialData;
    } else {
        selecionados = financialData.slice(-quantidade);
    }
    fecharDropdownFiltro();
    updateDashboard(selecionados);
    showToast(`Período: ${selecionados.length} mês(es).`, 'success');
}

function fecharDropdownFiltro() {
    const menu = document.getElementById('filter-dropdown');
    if (menu && !menu.classList.contains('hidden')) menu.classList.add('hidden');
}

// #############################################################
// # 10. ACESSIBILIDADE (itens 34, 35)
// #############################################################

const MODAIS = ['data-modal', 'restore-modal', 'config-modal', 'confirm-modal', 'lock-modal'];

function modalAberto() {
    return MODAIS.map((id) => document.getElementById(id)).find((el) => el && !el.classList.contains('hidden'));
}

function prepararAcessibilidade() {
    MODAIS.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
    });

    document.addEventListener('keydown', (e) => {
        const aberto = modalAberto();
        if (!aberto) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            // O bloqueio por senha não pode ser fechado com Esc.
            if (aberto.id === 'lock-modal') return;
            if (aberto.id === 'data-modal') closeModal();
            else if (aberto.id === 'restore-modal') closeRestoreModal();
            else if (aberto.id === 'config-modal') fecharConfig();
            else if (aberto.id === 'confirm-modal') fecharConfirmacao();
            return;
        }

        // Prende o foco dentro do modal (item 34).
        if (e.key === 'Tab') {
            const focaveis = aberto.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            );
            const visiveis = [...focaveis].filter((el) => el.offsetParent !== null && !el.disabled);
            if (visiveis.length === 0) return;
            const primeiro = visiveis[0];
            const ultimo = visiveis[visiveis.length - 1];
            if (e.shiftKey && document.activeElement === primeiro) {
                e.preventDefault();
                ultimo.focus();
            } else if (!e.shiftKey && document.activeElement === ultimo) {
                e.preventDefault();
                primeiro.focus();
            }
        }
    });
}

// Leva o foco para dentro do modal recém-aberto.
function focarModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const alvo = el.querySelector('input:not([type=hidden]), select, button');
    if (alvo) setTimeout(() => alvo.focus(), 50);
}

// #############################################################
// # 11. LEMBRETE DE BACKUP (item 46)
// #############################################################

const DIAS_ATE_LEMBRAR = 14;

function registrarBackupFeito() {
    try {
        localStorage.setItem('financialReportLastBackup', new Date().toISOString());
    } catch (err) {
        /* sem persistência */
    }
}

function checarLembreteDeBackup() {
    if (financialData.length === 0) return;
    let ultimo = null;
    try {
        ultimo = localStorage.getItem('financialReportLastBackup');
    } catch (err) {
        return;
    }

    if (!ultimo) {
        showToast(
            'Você ainda não gerou nenhum backup. Os dados ficam só neste aparelho — use o botão Backup.',
            'error',
        );
        return;
    }
    const dias = Math.floor((Date.now() - new Date(ultimo).getTime()) / 86400000);
    if (dias >= DIAS_ATE_LEMBRAR) {
        showToast(`Último backup há ${dias} dias. Vale gerar um novo pelo botão Backup.`, 'error');
    }
}

// #############################################################
// # 12. BLOQUEIO POR SENHA (item 49)
//
// Os dados são cifrados com AES-GCM e uma chave derivada da senha por
// PBKDF2. Sem a senha o conteúdo do armazenamento não é legível, nem
// para quem abrir o navegador com o aparelho na mão.
//
// Perder a senha significa perder os dados guardados aqui — por isso o
// painel exige baixar um backup antes de ativar o bloqueio, e o arquivo
// de backup continua sem cifra, para servir de recuperação.
// #############################################################

const CHAVE_COFRE = 'financialReportVault';
let senhaAtiva = null;

function temCofre() {
    try {
        return !!localStorage.getItem(CHAVE_COFRE);
    } catch (err) {
        return false;
    }
}

function criptografiaDisponivel() {
    return !!(window.crypto && window.crypto.subtle && window.isSecureContext);
}

function bytesParaBase64(bytes) {
    let bin = '';
    new Uint8Array(bytes).forEach((b) => {
        bin += String.fromCharCode(b);
    });
    return btoa(bin);
}

function base64ParaBytes(texto) {
    return Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
}

async function derivarChave(senha, sal) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: sal, iterations: 210000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

async function cifrarDados(senha, dados) {
    const sal = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const chave = await derivarChave(senha, sal);
    const conteudo = new TextEncoder().encode(JSON.stringify(dados));
    const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, conteudo);
    return { v: 1, sal: bytesParaBase64(sal), iv: bytesParaBase64(iv), dados: bytesParaBase64(cifrado) };
}

async function decifrarDados(senha, cofre) {
    const chave = await derivarChave(senha, base64ParaBytes(cofre.sal));
    const aberto = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ParaBytes(cofre.iv) },
        chave,
        base64ParaBytes(cofre.dados),
    );
    return JSON.parse(new TextDecoder().decode(aberto));
}

function abrirTelaDeBloqueio(modo) {
    const modal = document.getElementById('lock-modal');
    document.getElementById('lock-title').textContent = modo === 'definir' ? 'Criar senha' : 'Painel bloqueado';
    document.getElementById('lock-confirm-wrap').classList.toggle('hidden', modo !== 'definir');
    document.getElementById('lock-hint').textContent =
        modo === 'definir'
            ? 'Guarde a senha: sem ela os dados deste aparelho não podem ser lidos. O arquivo de backup continua sem senha e serve de recuperação.'
            : 'Digite a senha para abrir o painel.';
    document.getElementById('lock-password').value = '';
    document.getElementById('lock-password-2').value = '';
    document.getElementById('lock-error').classList.add('hidden');
    modal.dataset.modo = modo;
    modal.classList.remove('hidden');
    focarModal('lock-modal');
}

function erroDeBloqueio(mensagem) {
    const el = document.getElementById('lock-error');
    el.textContent = mensagem;
    el.classList.remove('hidden');
}

async function ativarBloqueio() {
    if (!criptografiaDisponivel()) {
        showToast(
            'O bloqueio exige uma página servida por HTTPS (ou localhost). Abrindo o arquivo direto do aparelho ele não fica disponível.',
            'error',
        );
        return;
    }
    if (financialData.length === 0) {
        showToast('Não há dados para proteger.', 'error');
        return;
    }
    abrirConfirmacao(
        'Ativar bloqueio por senha',
        'Baixe um backup antes de continuar. Se a senha for perdida, os dados guardados neste aparelho não poderão ser recuperados — só pelo arquivo de backup, que continua sem senha.',
        'Baixei o backup, continuar',
        'bg-blue-600 hover:bg-blue-700',
        () => abrirTelaDeBloqueio('definir'),
    );
}

async function desativarBloqueio() {
    abrirConfirmacao(
        'Remover bloqueio',
        'Os dados voltam a ficar legíveis para quem abrir o navegador neste aparelho. Confirma?',
        'Remover',
        'bg-red-600 hover:bg-red-700',
        () => {
            try {
                localStorage.removeItem(CHAVE_COFRE);
            } catch (err) {
                /* nada a fazer */
            }
            senhaAtiva = null;
            saveData();
            atualizarBotaoBloqueio();
            showToast('Bloqueio removido.', 'success');
        },
    );
}

function atualizarBotaoBloqueio() {
    const botao = document.getElementById('lock-toggle');
    if (!botao) return;
    const ativo = temCofre();
    botao.innerHTML = `<i class="fas ${ativo ? 'fa-lock' : 'fa-lock-open'} mr-1"></i> ${ativo ? 'Bloqueio ativo' : 'Proteger com senha'}`;
    botao.onclick = ativo ? desativarBloqueio : ativarBloqueio;
}

// #############################################################
// # 13. EXPORTAÇÃO PARA A CONTABILIDADE (item 50)
//
// Uma planilha com colunas fixas, uma linha por mês e os totais no
// fim — o formato que o contador consegue importar direto, sem ter de
// interpretar o painel.
// #############################################################

function exportarParaContabilidade() {
    const dados = dadosVisiveis();
    if (dados.length === 0) {
        showToast('Não há dados para exportar.', 'error');
        return;
    }

    const colunas = [
        'Competência',
        'Receita Dinheiro',
        'Receita Cartão',
        'Receita Pix',
        'Receita iFood',
        'Receita Bruta',
        'Taxas Retidas',
        'Receita Líquida',
        'Custo Mercadoria (CMV)',
        'Despesas Operacionais',
        'Despesas Totais',
        'Resultado',
        'Margem %',
    ];

    const linhas = dados.map((item) => {
        const bruta = getGrossIncome(item);
        const operacional = item.expenses - item.cmv;
        return [
            escapeCsv(competenciaISO(item.month)),
            item.cash.toFixed(2),
            item.card.toFixed(2),
            item.pix.toFixed(2),
            item.ifood.toFixed(2),
            bruta.toFixed(2),
            getFees(item).toFixed(2),
            getNetIncome(item).toFixed(2),
            item.cmv.toFixed(2),
            operacional.toFixed(2),
            item.expenses.toFixed(2),
            getProfit(item).toFixed(2),
            getMargin(item).toFixed(1),
        ].join(';');
    });

    const total = [
        escapeCsv('TOTAL'),
        somar(dados, (d) => d.cash).toFixed(2),
        somar(dados, (d) => d.card).toFixed(2),
        somar(dados, (d) => d.pix).toFixed(2),
        somar(dados, (d) => d.ifood).toFixed(2),
        somar(dados, getGrossIncome).toFixed(2),
        somar(dados, getFees).toFixed(2),
        somar(dados, getNetIncome).toFixed(2),
        somar(dados, (d) => d.cmv).toFixed(2),
        somar(dados, (d) => d.expenses - d.cmv).toFixed(2),
        somar(dados, (d) => d.expenses).toFixed(2),
        somar(dados, getProfit).toFixed(2),
        (somar(dados, getNetIncome) > 0 ? (somar(dados, getProfit) / somar(dados, getNetIncome)) * 100 : 0).toFixed(1),
    ].join(';');

    const conteudo = [colunas.join(';'), ...linhas, total].join('\r\n');
    baixarArquivo(
        new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' }),
        `contabilidade_${dados[0].month.replace('/', '-')}_a_${dados[dados.length - 1].month.replace('/', '-')}.csv`,
    );
    showToast('Planilha para a contabilidade gerada.', 'success');
}

// Competência no formato AAAA-MM, que sistemas contábeis entendem.
function competenciaISO(mesTexto) {
    const chave = monthSortKey(mesTexto);
    if (chave === Number.MAX_SAFE_INTEGER) return mesTexto;
    const ano = Math.floor((chave - 1) / 12);
    const mes = chave - ano * 12;
    return `${ano}-${String(mes).padStart(2, '0')}`;
}

// Download centralizado: o link precisa estar no DOM e a URL só pode
// ser liberada depois, senão o mobile trunca o arquivo.
function baixarArquivo(blob, nome) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
    }, 5000);
}

// #############################################################
// # 14. SERVICE WORKER (item 28)
// #############################################################

function registrarServiceWorker() {
    // file:// não suporta service worker; só registra quando servido.
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch(() => {
        /* segue sem offline */
    });
}
