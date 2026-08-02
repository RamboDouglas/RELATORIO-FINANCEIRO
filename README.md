# Relatório Financeiro — Conveniência

Painel financeiro mensal para uma loja de conveniência. Registra as entradas por forma de pagamento e as despesas de cada mês, e a partir disso calcula lucro, margem, tendências, gráficos e análises automáticas.

É um **arquivo HTML único** (`index.html`). Não precisa de instalação, servidor, build nem banco de dados: basta abrir o arquivo no navegador, no computador ou no celular.

---

## Sumário

- [Como usar](#como-usar)
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
- [Onde os dados ficam guardados](#onde-os-dados-ficam-guardados)
- [Comportamento em situações adversas](#comportamento-em-situações-adversas)
- [Fórmulas usadas](#fórmulas-usadas)
- [Tecnologias](#tecnologias)

---

## Como usar

Abra o `index.html` no navegador — clicando duas vezes no arquivo, ou pelo endereço onde ele estiver publicado.

Na primeira vez, o painel já vem com oito meses de exemplo (Set/2024 a Abr/2025). A partir daí tudo o que você adicionar, editar ou excluir fica gravado no próprio navegador.

Para gráficos, ícones e exportação em PDF o app carrega bibliotecas da internet. Sem conexão, o painel continua funcionando (tabelas, cadastro, backup, CSV) — apenas os gráficos e o PDF ficam indisponíveis.

---

## Dados de cada mês

Cada registro guarda seis campos:

| Campo | Descrição |
|---|---|
| **Mês** | Texto no formato `Mai/2025` |
| **Entrada (Dinheiro)** | Vendas recebidas em espécie |
| **Entrada (Cartão)** | Vendas recebidas em cartão |
| **Entrada (Pix)** | Vendas recebidas via Pix |
| **Entrada (iFood)** | Vendas pelo iFood |
| **Saídas (Despesas)** | Total de despesas do mês |

Receita bruta, lucro e margem **não são digitados** — são calculados a partir desses seis campos.

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

O botão **CSV** baixa `relatorio_financeiro.csv` com uma linha por mês e nove colunas: mês, as quatro entradas separadas, entrada bruta, saídas, lucro e margem.

O arquivo usa ponto e vírgula como separador e vem com marca de codificação UTF-8, de modo que abre direto no Excel em português, com acentos corretos.

Exporta **todos** os meses cadastrados, não apenas o período filtrado.

---

## Exportar PDF

O botão **PDF** gera `relatorio_executivo.pdf` com duas páginas:

1. Título, resumo geral (quantidade de meses, receita e despesa totais) e imagens dos gráficos de *Receita vs Despesas* e *Evolução dos Métodos*
2. Tabela com mês, receita, despesa, lucro e margem

Atenção a uma particularidade: o resumo e a tabela cobrem **todos** os meses cadastrados, enquanto as imagens dos gráficos são capturadas da tela como ela está no momento — ou seja, refletem o filtro aplicado. Com um período filtrado, os gráficos do PDF mostram menos meses do que a tabela.

Durante a geração o botão mostra *Gerando...* e fica desabilitado. Depende das bibliotecas da internet; sem elas o app avisa em vez de falhar em silêncio.

---

## Backup e restauração

Como os dados ficam no próprio aparelho, o backup é a forma de levá-los para outro celular ou computador — e a única proteção contra perda.

### Gerar backup

Botão **Backup**. Nos celulares que oferecem compartilhamento nativo, abre o menu do sistema e permite salvar no Google Drive, em Arquivos, ou enviar por WhatsApp. Nos demais casos — inclusive no computador — o arquivo é baixado direto.

O arquivo se chama `backup_financeiro_AAAA-MM-DD.json` e contém todos os meses cadastrados.

### Restaurar backup

Botão **Restaurar**, escolha o arquivo `.json`. Antes de mudar qualquer coisa, aparece um resumo do que será alterado — por exemplo: *"O arquivo tem 10 registros: 2 meses que ainda não estão aqui e 8 já existentes. Neste aparelho há 9 meses salvos."*

Aí você escolhe entre duas opções:

- **Mesclar** (recomendado) — mantém os meses que já estão no aparelho, acrescenta os que faltam e atualiza os repetidos com os valores do arquivo. É o que você quer ao passar dados do computador para o celular sem perder o que já havia registrado lá.
- **Substituir tudo** — apaga os dados atuais e deixa somente o conteúdo do arquivo.

Se o arquivo não for um backup válido, ou se a leitura falhar, o app diz o que houve. Nada acontece em silêncio.

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

- **Sem internet ou com CDN bloqueado** — o painel continua funcionando: tabelas, cadastro, filtro, CSV e backup. Só gráficos e PDF ficam de fora, com aviso ao tentar gerar o PDF.
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
| [Tailwind CSS](https://tailwindcss.com) | Estilos e layout responsivo |
| [Chart.js](https://www.chartjs.org) + plugin *datalabels* | Os quatro gráficos |
| [Font Awesome](https://fontawesome.com) | Ícones |
| [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com) | Exportação em PDF |

As bibliotecas são carregadas de CDN, sem instalação. Não há dependências para baixar, nem etapa de build.
