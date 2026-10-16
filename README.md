# vc me paga — Web

Front-end estático em HTML, CSS e JS para reunir itens de várias NFC-e.
O app consulta [invoice-searcher-api](https://github.com/frade-op/invoice-searcher-api), mantém
cada nota expansível e consolida seus itens em uma tabela editável.

**Assinatura:** “A nota lida. A conta dividida.”

## Identidade visual

- Logo: [assets/images/logo.png](assets/images/logo.png), exibida inteira em proporção quadrada no cabeçalho.
- Verde ação: `#22C55E` e `#10B981`, usado no botão principal e nos destaques.
- Verdes de confiança: `#064E3B` e `#022C22`, usados no cabeçalho e em títulos.
- Fundo neutro: `#F9FAFB`; cartões usam branco para manter leitura clara.
- Tipografia: Inter com fallback para fontes sans-serif do sistema.
- Tom de voz: direto, informal e focado em facilitar a divisão da conta.

## Estrutura de pastas

```text
index.html            página única (servida na raiz)
assets/
  css/styles.css      estilos
  images/             logo.png, logo.jpg e favicon.svg
  vendor/jsQR.js      biblioteca de terceiros
src/
  app.js              interface e eventos (ponto de entrada)
  config.js           ambiente e URL da API
  i18n.mjs            textos e traduções
  export.mjs          resumo em .md/.txt
  domain/             regras sem DOM: invoices, participants, shares, qr
tests/                testes com node --test
```

## Estado do produto

O app permite importar várias notas por URL e consultar cada nota importada em um painel expansível.
Cada nota nova começa recolhida; o usuário abre o painel para conferir seus itens.
Uma tabela consolidada reúne itens das notas e itens adicionados manualmente.
Hoje, a consulta automática está validada para NFC-e do Rio Grande do Sul (RS), pelo layout do
portal SVRS. Os portais estaduais diferem entre si, e alguns impõem requisitos de acesso; por
isso, aceitar um link não garante que a nota será reconhecida.
O objetivo é superar essas diferenças com integrações e parsers adequados a cada portal, ampliando
a consulta para mais estados e formatos de NFC-e. A expansão deve respeitar HTTPS e os controles
de segurança dos portais, sem tentar contornar CAPTCHA ou outras proteções de acesso.
Edite ou remova itens na tabela consolidada; as notas importadas permanecem imutáveis como registro.
Itens manuais pedem nome, quantidade, unidade e preço unitário; total é calculado automaticamente.
Tabela consolidada aparece antes das notas importadas, em cartões separados.
As seções de pagantes e consulta da nota podem ser recolhidas ou expandidas e começam abertas.
Na tabela consolidada, Item e Ações ficam sempre visíveis; Código, Qtd, Un, Preço un., Total
e Origem podem ser mostrados ou ocultados pelo menu no canto superior direito.
Por padrão, Item, Qtd, Un, Total e Ações aparecem; em tela de celular (até 600px) o carregamento
mostra apenas Item, Total e Ações, e a coluna Ações vira um único ícone que expande as opções
de cada item. O formulário de itens manuais fica abaixo da
tabela. Cabeçalhos das tabelas ordenam itens em ordem crescente ou decrescente.
O cadastro exige nome e sobrenome compostos apenas por letras; espaços, hífens e apóstrofos internos
são aceitos. Cada pagante recebe avatar circular com iniciais e cor aleatória. A edição atualiza
iniciais e mantém a cor do avatar. Ao importar uma nota ou adicionar item manual, todos os pagantes
cadastrados naquele momento são atribuídos aos itens novos. Cada pagante mostra o total devido;
remova ou adicione pagantes por item, ou edite a lista de itens pela ação do pagante. Pagantes
cadastrados depois não são atribuídos retroativamente. Valores são divididos igualmente por item;
centavos restantes vão para pagantes na ordem do cadastro. Itens sem pagantes não entram nos totais.
Na tabela consolidada, avatares circulares sobrepostos mostram dois pagantes por item; itens com
mais pagantes exibem os dois primeiros avatares e um indicador com a quantidade adicional.
Passe o mouse ou foque no indicador para consultar todos os nomes atribuídos.
Os pagantes ficam apenas na página atual e não persistem após recarregar.
Se uma nota for importada sem pagantes cadastrados, a mensagem de status lembra o usuário de
adicionar pagantes para dividir os valores.
O botão "Ler QR Code" do cartão de consulta abre a câmera (traseira em celulares, webcam em desktop),
detecta o QR Code da NFC-e e preenche o campo de link; o usuário confere e clica em "Adicionar nota".
"Tirar foto" abre a câmera nativa do celular (ou seletor de imagem) como alternativa quando a câmera
ao vivo não está disponível. Usa `BarcodeDetector` quando existe e a biblioteca
[jsQR](https://github.com/cozmo/jsQR) (Apache-2.0, em `assets/vendor/jsQR.js`) como alternativa.
Cobranças Pix ainda não estão implementadas.

## Favicon

O ícone da aba fica em [assets/images/favicon.svg](assets/images/favicon.svg) (recibo com marca de confirmado, nas cores da
marca) e é referenciado no `<head>` de [index.html](index.html).

## Exportar resumo

O cartão "Exportar resumo", no fim da página, baixa um arquivo `.md` (Markdown) ou `.txt`, à
escolha do usuário, com visão geral (total da compra, total atribuído e total sem pagantes),
quanto cada pagante deve com os itens de cada um e a tabela de produtos com origem e pagantes.
O texto sai no idioma ativo. A geração fica em [src/export.mjs](src/export.mjs) (`buildSummary`) e é
independente do DOM.

## Idiomas

O site existe em português (padrão) e inglês. Os botões PT/EN no cabeçalho trocam o idioma; a
escolha fica em `localStorage` (`vc-me-paga-language`) e, sem escolha salva, vale o idioma do
navegador. Textos ficam em [src/i18n.mjs](src/i18n.mjs) (`MESSAGES.pt` e `MESSAGES.en` devem ter as mesmas
chaves; um teste confere). Textos estáticos usam `data-i18n` e `data-i18n-attr` no HTML. Erros dos
módulos de domínio continuam em português e são traduzidos na exibição por `translateError`.
Mensagens enviadas pela API aparecem no idioma da API.

## Próximos passos

1. Apresentar resumo da divisão por pagante; integração com cobrança Pix pode vir depois.
2. Salvar os dados do usuário em banco de dados:
   - Definir a API de persistência (por exemplo, em `invoice-searcher-api` ou serviço novo) com
     autenticação e entidades `Compra`, `Pagante`, `Item`, `Divisão` e `Nota`.
   - Salvar a compra a cada mudança (ou por botão "Salvar") e listar compras anteriores.
   - Carregar a compra salva ao abrir o app, substituindo a perda de dados ao recarregar.
   - Tratar privacidade (LGPD): consentimento, exclusão de dados e minimização de dados pessoais.
3. Importar dados no mesmo formato do arquivo exportado:
   - Tornar o formato Markdown/TXT do resumo estável e versionado (cabeçalho com versão) e criar
     um parser que reconstrua pagantes, itens e divisões a partir dele.
   - Considerar também um formato estruturado (JSON) para importação sem perdas, já que o resumo
     legível arredonda e omite campos como código do item.
   - Adicionar botão "Importar resumo" com validação, pré-visualização e tratamento de nomes
     duplicados antes de mesclar com a compra atual.
   - Cobrir o parser com testes de ida e volta (exportar e importar devem resultar nos mesmos dados).

A câmera ao vivo depende de permissão do usuário e de contexto seguro (HTTPS), exceto em
`localhost`/`127.0.0.1`. Em celulares na rede local via HTTP, use "Tirar foto".

## Testes

Execute os testes de pagantes, itens, QR Code, exportação e idiomas com Node.js:

```powershell
node --test tests/participants.test.mjs tests/invoices.test.mjs tests/shares.test.mjs tests/qr.test.mjs tests/export.test.mjs
```

## Ambientes

Edite a constante `ENV` em [src/config.js](src/config.js) (`local`, `test` ou `prod`) para escolher
qual instância do serviço será chamada. Ajuste as URLs em `API_URLS` conforme necessário.

## Executando

Sirva a pasta com qualquer servidor estático:

```powershell
python -m http.server 5500
```

Abra http://127.0.0.1:5500. No ambiente `local`, suba a API em http://127.0.0.1:8000.

A API precisa liberar a origem do front-end via CORS (variável `CORS_ORIGINS`).

## Interface

A interface se adapta a telas pequenas, mantém a tabela rolável horizontalmente e oferece foco
visível para navegação por teclado. As seções de pagantes e consulta da nota podem ser recolhidas;
ambas começam expandidas. O cadastro de pagantes aparece antes da consulta da nota e permite
adicionar, editar e remover nomes. Importe mais de uma nota;
cada nota fica em um painel expansível, abaixo da tabela consolidada, e começa recolhida após
importação. Os itens dentro de cada nota são somente leitura e não podem ser editados ou removidos.
Edite ou remova itens apenas na tabela consolidada; os dados originais da nota permanecem intactos.
Pagantes podem ser editados e removidos pelos ícones amarelo e vermelho, com tooltip. Nome e
sobrenome são validados no cadastro e na edição; avatares coloridos identificam pagantes para
associação aos itens. Notas importadas e itens manuais incluem pagantes cadastrados no momento da
criação; novos pagantes não alteram itens anteriores. Totais mostram a parte igual de cada item,
com centavos restantes atribuídos na ordem do cadastro. Edite pagantes de cada item pelo ícone na
tabela ou escolha os itens devidos pela ação na lista de pagantes.
Na tabela consolidada, moedas sobrepostas identificam até dois pagantes por item; um indicador
adicional informa quantos outros pagantes estão atribuídos. O tooltip lista todos os nomes.
Configure colunas da tabela consolidada pelo menu no canto superior direito;
Item e Ações permanecem visíveis. O formulário de item manual fica abaixo da tabela. Ordene
qualquer tabela clicando nos cabeçalhos. Os ícones de edição e remoção têm tooltips. A coluna de
ações permanece fixa à direita durante a rolagem horizontal. O logo fica em `assets/images/logo.png`;
preserve esse caminho ao publicar o front-end.

## Modo Caveman para assistentes de IA

As instruções do projeto ativam respostas sucintas sem perder conteúdo técnico. Use `/ultracave`
para respostas ainda mais curtas, `/megacave` para chinês clássico ou `stop caveman` para
desativar o modo. As regras ficam versionadas para GitHub Copilot, Cline, Cursor, OpenCode e
Windsurf; [AGENTS.md](AGENTS.md) contém a versão geral.

O modo só altera as respostas dos assistentes de IA. Não altera a aplicação nem exige bibliotecas
ou dependências de execução.
