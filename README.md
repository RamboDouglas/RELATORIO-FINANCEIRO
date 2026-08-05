# Relatório Financeiro — Conveniência

Painel financeiro mensal para uma loja de conveniência. Registra as entradas por forma de pagamento e as despesas de cada mês, e a partir disso calcula lucro, margem, tendências, gráficos e análises automáticas.

É um site estático em HTML, CSS e JavaScript puros, sem framework e sem servidor próprio. Todas as bibliotecas ficam dentro do repositório, então ele **funciona sem internet** — inclusive instalado como aplicativo no celular.

---

## Sumário

- [Como usar](#como-usar)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Desenvolvimento](#desenvolvimento)
- [Dados de cada mês](#dados-de-cada-mês)
- [Cadastro: adicionar, editar e excluir](#cadastro-adicionar-editar-e-excluir)
- [Filtro de período](#filtro-de-período)
- [O que o painel mostra](#o-que-o-painel-mostra)
  - [Visão geral (indicadores)](#visão-geral-indicadores)
  - [Gráficos](#gráficos)
  - [Detalhamento mensal](#detalhamento-mensal)
  - [Insights dinâmicos](#insights-dinâmicos)
  - [Análise detalhada por mês](#análise-detalhada-por-mês)
  - [Destaques do período](#destaques-do-período)
- [Exportar CSV](#exportar-csv)
- [Exportar PDF](#exportar-pdf)
- [Backup e restauração](#backup-e-restauração)
- [Proteção por senha](#proteção-por-senha)
- [Onde os dados ficam guardados](#onde-os-dados-ficam-guardados)
- [Comportamento em situações adversas](#comportamento-em-situações-adversas)
- [Fórmulas usadas](#fórmulas-usadas)
- [Tecnologias](#tecnologias)

---

## Como usar

**Instalado no celular (recomendado).** Abra o endereço publicado, toque no menu do navegador e escolha *Adicionar à tela de início*. O painel passa a abrir como um aplicativo, em tela cheia, e funciona sem internet.

**No navegador.** Basta acessar o endereço publicado. Também dá para abrir o `index.html` direto do computador, clicando duas vezes: tudo funciona, com duas exceções que dependem de uma página servida por HTTPS — o modo offline e o bloqueio por senha.

Na primeira vez o painel vem com oito meses de exemplo (Set/2024 a Abr/2025). A partir daí tudo o que você adicionar, editar ou excluir fica gravado no próprio aparelho.

### Tema

O painel segue o tema do sistema (claro ou escuro) e respeita a sua escolha pelo botão ao lado do título.

---

## Dados de cada mês

Cada registro guarda seis campos:

| Campo | Descrição |
|---|---|
| **Mês** | Escolhido em dois seletores (mês e ano), sem digitação livre |
| **Entrada (Dinheiro)** | Vendas recebidas em espécie |
| **Entrada (Cartão)** | Vendas recebidas em cartão |
| **Entrada (Pix)** | Vendas recebidas via Pix |
| **Entrada (iFood)** | Vendas pelo iFood |
| **Saídas (Despesas)** | Total de despesas do mês |
| **Mercadoria / CMV** | Opcional. Parte das despesas que é compra de mercadoria |
| **Nº de vendas** | Opcional. Preenchido, habilita o ticket médio |

Receita bruta, lucro, margem, ticket médio e margem de contribuição **não são digitados** — são calculados.

Cada registro guarda ainda a data da última alteração e, quando os dados vêm do app de caixa, o detalhamento das despesas por categoria.

Os meses são sempre reordenados por data, independentemente da ordem em que você cadastrar. Variações de grafia como `mai/2025`, `MAIO/25` ou `Mai/25` são reconhecidas. Um mês com nome irreconhecível não quebra a lista: vai para o fim.

---

## Cadastro: adicionar, editar e excluir

**Adicionar** — botão verde `+ Adicionar` no topo. Abre o formulário com os seis campos.

**Editar** — ícone de lápis na coluna *Ações* da tabela. Abre o mesmo formulário já preenchido.

**Excluir** — ícone de lixeira na mesma coluna, com confirmação antes de apagar.

Se você adicionar um mês que já existe, o registro existente é **atualizado** em vez de criar uma segunda linha repetida.

---

## Filtro de período

O botão **Analisar Período** abre uma lista com todos os meses cadastrados, cada um com uma caixa de seleção, mais a opção *Selecionar Todos*. Marque os meses desejados e clique em **Aplicar**.

O painel inteiro passa a refletir apenas o período escolhido: indicadores, gráficos, tabela, insights, abas de análise e destaques.

---

## O que o painel mostra

### Visão geral (indicadores)

Quatro cartões no topo, calculados sobre o período selecionado:

- **Receita Total** — soma de todas as entradas
- **Despesas Totais**
- **Lucro Líquido**
- **Margem Média**

Os três primeiros trazem uma **seta de tendência** comparando com o período imediatamente anterior de mesmo tamanho. Se você seleciona 3 meses, a comparação é com os 3 meses anteriores a eles. Nas despesas a lógica é invertida de propósito: queda aparece em verde, alta em vermelho.

A tendência não aparece quando todos os meses estão selecionados (não há período anterior com que comparar).

Acima dos cartões há três etiquetas: a data de hoje, a quantidade de meses no período e o total de vendas.

### Gráficos

| Gráfico | Tipo | Mostra |
|---|---|---|
| **Receita vs Despesas** | Barras | Receita bruta e despesas lado a lado, mês a mês |
| **Margem de Lucro Mensal** | Linha com área | Evolução da margem em % |
| **Distribuição Total** | Rosca | Participação de dinheiro, cartão, Pix e iFood, com o percentual escrito em cada fatia |
| **Evolução dos Métodos** | Linha | As quatro formas de pagamento ao longo dos meses |

### Detalhamento mensal

Tabela com uma linha por mês: **Mês, Entrada Bruta, Saídas, Lucro, Margem** e a coluna de ações.

O lucro aparece em vermelho quando negativo, e a margem em vermelho quando fica abaixo de 10%.

### Insights dinâmicos

Frases geradas automaticamente a partir do período selecionado:

1. O mês de maior lucro e o valor alcançado
2. A forma de pagamento mais representativa e quanto ela somou
3. A variação da receita em relação ao período anterior
4. Um alerta listando os meses que operaram com prejuízo, quando houver

### Análise detalhada por mês

Abas com os meses do período. Ao escolher uma delas, aparece:

- **Resumo** — receita bruta, despesas, lucro líquido e margem, com cores conforme o desempenho
- **Detalhamento das entradas** — quanto veio de dinheiro, cartão, Pix e iFood
- **Sugestões** — um comentário automático conforme o resultado do mês:

| Situação | Sugestão |
|---|---|
| Prejuízo | Revisar despesas e estratégias de venda com urgência |
| Margem abaixo de 10% | Analisar custos variáveis e precificação |
| Margem acima de 35% | Identificar o que funcionou para repetir |
| Demais casos | Desempenho sólido, seguir monitorando custos |

### Destaques do período

Quatro cartões: **melhor mês** por lucro, **pior mês** por lucro, **maior receita** e **melhor margem**.

---

## Exportar CSV

O botão **CSV** baixa `relatorio_financeiro.csv` com uma linha por mês: mês, as quatro entradas separadas, entrada bruta, taxas, receita líquida, saídas, mercadoria, nº de vendas, lucro e margem.

O arquivo usa ponto e vírgula como separador e vem com marca de codificação UTF-8, de modo que abre direto no Excel em português, com acentos corretos.

Exporta o **período selecionado** no filtro. Campos de texto são protegidos contra fórmulas, para que uma planilha não execute conteúdo ao abrir o arquivo.

O mesmo arquivo pode ser importado de volta pelo botão **Restaurar**: o painel reconhece o CSV pelo cabeçalho, aceita ponto e vírgula ou vírgula como separador, e ignora linhas sem um mês reconhecível — avisando quantas foram.

---

## Exportar PDF

O botão **PDF** gera `relatorio_executivo.pdf`:

1. Título, resumo do período e sumário executivo em texto
2. Gráficos de *Receita vs Despesas* e *Evolução dos Métodos*
3. Tabela com mês, receita, despesa, lucro e margem, quebrando em novas páginas quando necessário

A primeira página traz um **sumário executivo em frases** — lucro, margem, melhor e pior mês, rumo da margem, meses com prejuízo, composição das despesas e ticket médio — para quem lê o PDF sem ter o painel na frente. Tabela e gráficos usam o mesmo período selecionado.

Durante a geração o botão mostra *Gerando...* e fica desabilitado. Depende das bibliotecas da internet; sem elas o app avisa em vez de falhar em silêncio.

---

## Backup e restauração

Como os dados ficam no próprio aparelho, o backup é a forma de levá-los para outro celular ou computador — e a única proteção contra perda.

O arquivo de backup tem **formato versionado**: além dos meses, guarda a versão do modelo, a data de exportação, as taxas e metas, e as somas usadas na conferência. Arquivos gerados por versões anteriores (uma lista pura de meses) continuam sendo aceitos.

### Gerar backup

Botão **Backup**. Nos celulares que oferecem compartilhamento nativo, abre o menu do sistema e permite salvar no Google Drive, em Arquivos, ou enviar por WhatsApp. Nos demais casos — inclusive no computador — o arquivo é baixado direto.

O arquivo se chama `backup_financeiro_AAAA-MM-DD.json` e contém todos os meses cadastrados.

### Restaurar backup

Botão **Restaurar**, escolha o arquivo `.json`. Antes de mudar qualquer coisa, aparece um resumo do que será alterado — por exemplo: *"O arquivo tem 10 registros: 2 meses que ainda não estão aqui e 8 já existentes. Neste aparelho há 9 meses salvos."*

Aí você escolhe entre duas opções:

- **Mesclar** (recomendado) — mantém os meses que já estão no aparelho, acrescenta os que faltam e atualiza os repetidos com os valores do arquivo. É o que você quer ao passar dados do computador para o celular sem perder o que já havia registrado lá.
- **Substituir tudo** — apaga os dados atuais e deixa somente o conteúdo do arquivo.

Se o arquivo não for um backup válido, ou se a leitura falhar, o app diz o que houve. Nada acontece em silêncio.

### Importar do Controle Financeiro (app de caixa)

O mesmo botão **Restaurar** aceita o backup do app de caixa. Ele reconhece o formato sozinho e transforma os lançamentos diários em um registro por mês:

- **Receita** — vendas do tipo *entrada*, agrupadas pela forma de pagamento em dinheiro, cartão e pix. Formas criadas depois também são reconhecidas pelo prefixo (`cartao_stone` entra em cartão).
- **Despesas** — saídas de caixa mais boletos. Os dois somam sem risco de contagem dupla: as saídas são compras miúdas do dia (gelo, marmita), não pagamento de boleto.
- **Gastos pessoais ficam de fora** — são retiradas do dono, não custo da loja. O total ignorado aparece no resumo antes de você confirmar.
- **iFood vem zerado** — naquele sistema o iFood não é forma de pagamento separada, já entra em cartão, dinheiro ou pix. Preencha a coluna à mão pelo botão de editar.
- **O mês corrente não entra** — ele teria poucos dias de venda contra boletos do mês inteiro, muitos com vencimento futuro, e a margem sairia irreal. Ele é importado sozinho na próxima vez, depois de fechado.

Ao mesclar, o **iFood digitado à mão é preservado**: reimportar para buscar um mês novo não zera o que você já preencheu, e o resumo informa em quantos meses ele foi mantido. Se alguma forma de pagamento não for reconhecida, o app avisa quanto ficou de fora em vez de descartar em silêncio.


---

## Taxas e metas

O botão **Taxas e metas**, ao lado de *Visão Geral*, abre a configuração que vale para o painel inteiro.

**Taxas retidas** — percentuais de cartão e iFood. Sem elas o painel trata entrada bruta como receita, e o lucro sai superestimado: iFood costuma cobrar entre 12% e 30%, cartão entre 2% e 4%. Configuradas, o painel passa a mostrar receita líquida ao lado da bruta e calcula lucro e margem sobre a líquida. Em zero (o padrão) nada muda.

**Metas mensais** de receita e margem. Preenchidas, aparecem barras de progresso acima dos indicadores; a meta de receita é multiplicada pelos meses do período selecionado. Zero desliga o acompanhamento.

As duas configurações viajam junto no arquivo de backup.

---

## Análises automáticas

Além dos indicadores e gráficos, o painel calcula sozinho:

| Análise | O que faz |
|---|---|
| **Ano a ano** | Compara cada mês com o mesmo mês do ano anterior — numa conveniência a sazonalidade pesa mais que o mês anterior. Aparece na tabela e nos insights |
| **Média móvel de 3 meses** | Linha tracejada no gráfico de margem, para ver a tendência sem o ruído mês a mês |
| **Meses fora do padrão** | Marca com um triângulo os meses cuja margem se afasta mais de dois desvios-padrão da média do período |
| **Projeção do mês corrente** | Se o mês em curso está lançado, estima o fechamento pela proporção de dias decorridos, deixando claro que é estimativa |
| **Margem de contribuição** | Com o CMV preenchido, mostra o que sobra depois de pagar a mercadoria |
| **Ticket médio** | Com o número de vendas preenchido |
| **Composição das despesas** | Gráfico por categoria, alimentado pela importação do app de caixa |

### Comparar períodos

A seção **Comparar Períodos** coloca dois recortes lado a lado — receita bruta, receita líquida, despesas, lucro e margem. Os valores são a **média por mês** de cada período, para que recortes de tamanhos diferentes fiquem comparáveis.

---

## Proteções contra perda de dados

- **Desfazer** — depois de excluir um mês, mesclar ou substituir por backup, uma barra oferece desfazer por alguns segundos.
- **Cópia automática** — antes de toda operação destrutiva o estado atual é gravado à parte, como rede de proteção caso a página feche em seguida.
- **Conferência do arquivo** — o backup declara quantos registros e quanto somam; se não bater na importação, o painel avisa antes de você confirmar.
- **Alerta de digitação** — um valor três vezes acima ou abaixo da mediana do histórico pede uma segunda confirmação, para pegar zero a mais ou a menos.
- **Confirmações na própria página** — nenhuma ação depende das janelas do navegador, que aplicativos como WhatsApp e Instagram bloqueiam.


---

## Estrutura do projeto

```
index.html               Marcação da interface
css/tailwind.css         CSS gerado pelo Tailwind (versionado)
css/styles.css           Estilos próprios
js/core.js               Cálculo e conversões — funções puras, testáveis
js/app.js                Interface, gráficos e eventos
vendor/                  Chart.js, Font Awesome, jsPDF e html2canvas
sw.js                    Service worker (modo offline)
manifest.webmanifest     Instalação como aplicativo
tests/                   Testes do núcleo e de interface
```

A separação entre `core.js` e `app.js` é proposital: o núcleo não toca no DOM
nem no armazenamento, tudo entra por parâmetro e sai como retorno. É o que
permite testar a parte onde um erro significa número errado no relatório.

## Desenvolvimento

```bash
npm install          # dependências (só para desenvolver)
npm run serve        # sobe o painel em http://127.0.0.1:8080
npm run build:css    # regenera css/tailwind.css depois de mexer em classes
npm test             # testes do núcleo + interface
npm run lint         # ESLint
npm run format       # Prettier
```

O `css/tailwind.css` é versionado de propósito: quem só quer usar o painel não
precisa de build. Se você alterar classes no HTML ou no JS, rode
`npm run build:css` e inclua o arquivo gerado no commit — a integração contínua
verifica se ele está atualizado.

A cada push na branch principal, o GitHub Actions roda lint, formatação e todos
os testes, e publica o painel no GitHub Pages.

---

## Proteção por senha

O botão no rodapé ativa um bloqueio opcional. Com ele ligado, os dados deixam de
ficar legíveis no armazenamento do navegador: passam a ser cifrados com AES-GCM,
usando uma chave derivada da senha por PBKDF2. Ao abrir o painel, a senha é
pedida antes de qualquer coisa aparecer.

**Guarde a senha.** Sem ela os dados guardados no aparelho não podem ser
recuperados. O arquivo de backup continua sem cifra justamente para servir de
recuperação — por isso o painel pede que você baixe um antes de ativar.

O bloqueio exige uma página servida por HTTPS (ou localhost). Abrindo o arquivo
direto do aparelho ele não fica disponível.

---

## Onde os dados ficam guardados

Os dados ficam no **armazenamento local do navegador** (`localStorage`), na chave `financialReportData`. Isso tem três consequências importantes:

- **Cada aparelho tem sua própria base.** O que você cadastra no celular não aparece no computador, e vice-versa. A troca é feita pelo arquivo de backup.
- **Cada navegador tem sua própria base.** Chrome e Safari no mesmo celular guardam dados separados.
- **Não há sincronização automática nem servidor.** Nada é enviado para a internet: as informações não saem do seu aparelho.

**Recomendação:** gere um backup com alguma regularidade. O Safari do iPhone pode apagar o armazenamento local após cerca de sete dias sem que o site seja aberto, e limpar os dados de navegação apaga tudo em qualquer navegador.

---

## Comportamento em situações adversas

O app foi ajustado para não falhar em silêncio:

- **Sem internet** — depois da primeira visita o painel abre normalmente, com gráficos, ícones e PDF, porque tudo fica guardado no aparelho pelo service worker.
- **Armazenamento bloqueado** (aba anônima, memória cheia) — o mês adicionado aparece normalmente na tela e um aviso explica que os dados somem ao recarregar, orientando a baixar o backup.
- **Dados salvos corrompidos** — o app avisa, carrega os dados iniciais e regrava, para o erro não se repetir a cada abertura.
- **Arquivo de backup com valores em texto** — números escritos como `"1.234,56"` ou `"R$ 2.500,00"` são convertidos corretamente na importação.
- **Navegadores embutidos de aplicativos** (WhatsApp, Instagram) — o seletor de arquivos abre pelo toque real, e os avisos do cadastro e do backup aparecem na própria página, sem depender das janelas do navegador que esses apps costumam bloquear. A confirmação de exclusão é a única que ainda usa a janela padrão: se ela estiver bloqueada, a exclusão simplesmente não acontece — nada é apagado por engano.

---

## Fórmulas usadas

```
Entrada Bruta = Dinheiro + Cartão + Pix + iFood

Lucro = Entrada Bruta − Saídas

Margem (%) = Lucro ÷ Entrada Bruta × 100     (0% quando a entrada bruta é zero)

Tendência (%) = (período atual − período anterior) ÷ período anterior × 100
```

O *período anterior* é o conjunto de meses imediatamente antes do período selecionado, com a mesma quantidade de meses.

---

## Tecnologias

| Recurso | Uso |
|---|---|
| HTML, CSS e JavaScript puros | Toda a aplicação, em arquivo único |
| [Tailwind CSS](https://tailwindcss.com) | Estilos e layout responsivo, gerados por build |
| [Chart.js](https://www.chartjs.org) + plugin *datalabels* | Os quatro gráficos |
| [Font Awesome](https://fontawesome.com) | Ícones |
| [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com) | Exportação em PDF |

Todas ficam em `vendor/`, versionadas no repositório: o painel não depende de
CDN nem de conexão para funcionar.
