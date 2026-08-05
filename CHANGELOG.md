# Registro de mudanças

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento conforme [SemVer](https://semver.org/lang/pt-BR/).

## [1.0.0]

Primeira versão organizada como projeto: código separado em arquivos,
bibliotecas locais, testes automatizados e publicação contínua.

### Adicionado

- **Aplicativo instalável (PWA)**: manifest, ícones e service worker. Dá para
  instalar na tela inicial do celular e usar sem internet.
- **Bibliotecas dentro do repositório**: Chart.js, Font Awesome, jsPDF e
  html2canvas deixaram de vir de CDN. Uma queda de rede não derruba mais os
  gráficos nem o PDF.
- **Tema claro e escuro**, com a preferência do sistema como padrão e a escolha
  guardada no aparelho.
- **Atalhos de período**: últimos 3, 6 ou 12 meses, ano corrente e histórico
  completo.
- **Bloqueio por senha** (opcional): os dados passam a ser guardados cifrados
  com AES-GCM e chave derivada por PBKDF2. Sem a senha o conteúdo do
  armazenamento não é legível.
- **Lembrete de backup** quando passam 14 dias sem exportação.
- **Planilha para a contabilidade**: colunas fixas, competência em AAAA-MM,
  separação entre custo de mercadoria e despesa operacional, e linha de totais.
- **Testes automatizados**: 27 casos do núcleo de cálculo em Node e uma bateria
  de interface em Playwright, cobrindo importação, modais, tema, bloqueio,
  exportações e o layout no celular.
- **Integração contínua** no GitHub Actions: lint, formatação, testes e
  conferência de que o CSS versionado está atualizado.
- **Publicação automática** no GitHub Pages a cada push na branch principal.
- Versão do painel visível no rodapé.

### Alterado

- O arquivo único de mil linhas virou `index.html`, `css/`, `js/core.js`
  (funções puras, testáveis) e `js/app.js` (interface).
- O Tailwind passou a ser gerado por build e versionado, em vez do CDN de
  desenvolvimento, que avisa no console não ser para produção.
- O filtro de período deixou de ser reiniciado ao adicionar, editar ou excluir
  um mês.
- Os valores dos eixos dos gráficos são abreviados em telas estreitas.

### Acessibilidade

- Modais fecham com Esc e prendem o foco enquanto abertos.
- Botões que só têm ícone ganharam rótulo acessível; modais têm papel de
  diálogo.
- Prejuízo e margem baixa passaram a ter ícone além da cor.
- Cabeçalhos da tabela com `scope` e legenda para leitor de tela.

### Corrigido

- Elementos fixos (aviso e barra de desfazer) podiam ficar mais largos que a
  tela em aparelhos estreitos.
- `carregarConfig` substituía o objeto de configuração em vez de alterá-lo, o
  que fazia as taxas de cartão e iFood deixarem de valer nos cálculos.

## [0.2.0]

### Adicionado

- Taxas de cartão e iFood, com separação entre receita bruta e líquida.
- Categorias de despesa, custo de mercadoria (CMV) e margem de contribuição.
- Metas mensais de receita e margem, comparação ano a ano, projeção do mês
  corrente, média móvel de três meses e marcação de meses fora do padrão.
- Gráfico de composição das despesas, tabela ordenável e comparação entre dois
  períodos.
- Importação do backup do app de caixa e de arquivos CSV.
- Backup em formato versionado, com conferência de integridade, cópia
  automática antes de operações destrutivas e botão de desfazer.

### Corrigido

- O nome do mês era interpolado dentro de um `onclick`, então um arquivo de
  backup adulterado executava código na página.
- O PDF misturava todos os meses na tabela com o período filtrado nos gráficos.

## [0.1.0]

### Corrigido

- Restauração de backup no celular, que falhava em silêncio por seis motivos
  independentes.
- Download de backup truncado no mobile.
- Falha de CDN derrubava a página inteira.
- Cabeçalho reorganizado para caber melhor em telas de celular.
