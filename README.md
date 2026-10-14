# vc me paga — Web

Front-end estático em HTML, CSS e JS para reunir itens de várias NFC-e.
O app consulta [invoice-searcher-api](https://github.com/frade-op/invoice-searcher-api), mantém
cada nota expansível e consolida seus itens em uma tabela editável.

**Assinatura:** “A nota lida. A conta dividida.”

## Identidade visual

- Logo: [images/logo.png](images/logo.png), exibida inteira em proporção quadrada no cabeçalho.
- Verde ação: `#22C55E` e `#10B981`, usado no botão principal e nos destaques.
- Verdes de confiança: `#064E3B` e `#022C22`, usados no cabeçalho e em títulos.
- Fundo neutro: `#F9FAFB`; cartões usam branco para manter leitura clara.
- Tipografia: Inter com fallback para fontes sans-serif do sistema.
- Tom de voz: direto, informal e focado em facilitar a divisão da conta.

## Estado do produto

O app permite importar várias notas por URL e consultar cada nota importada em um painel expansível.
Cada nota nova começa recolhida; o usuário abre o painel para conferir seus itens.
Uma tabela consolidada reúne itens das notas e itens adicionados manualmente.
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
[jsQR](https://github.com/cozmo/jsQR) (Apache-2.0, em `vendor/jsQR.js`) como alternativa.
Cobranças Pix ainda não estão implementadas.

## Próximos passos

1. Apresentar resumo da divisão por pagante; integração com cobrança Pix pode vir depois.

A câmera ao vivo depende de permissão do usuário e de contexto seguro (HTTPS), exceto em
`localhost`/`127.0.0.1`. Em celulares na rede local via HTTP, use "Tirar foto".

## Testes

Execute os testes de pagantes, itens e QR Code com Node.js:

```powershell
node --test tests/participants.test.mjs tests/invoices.test.mjs tests/shares.test.mjs tests/qr.test.mjs
```

## Ambientes

Edite a constante `ENV` em [config.js](config.js) (`local`, `test` ou `prod`) para escolher
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
ações permanece fixa à direita durante a rolagem horizontal. O logo fica em `images/logo.png`;
preserve esse caminho ao publicar o front-end.

## Modo Caveman para assistentes de IA

As instruções do projeto ativam respostas sucintas sem perder conteúdo técnico. Use `/ultracave`
para respostas ainda mais curtas, `/megacave` para chinês clássico ou `stop caveman` para
desativar o modo. As regras ficam versionadas para GitHub Copilot, Cline, Cursor, OpenCode e
Windsurf; [AGENTS.md](AGENTS.md) contém a versão geral.

O modo só altera as respostas dos assistentes de IA. Não altera a aplicação nem exige bibliotecas
ou dependências de execução.
