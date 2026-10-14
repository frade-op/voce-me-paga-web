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
Por padrão, Item, Qtd, Un, Total e Ações aparecem. O formulário de itens manuais fica abaixo da
tabela. Cabeçalhos das tabelas ordenam itens em ordem crescente ou decrescente.
O cadastro exige nome e sobrenome compostos apenas por letras; espaços, hífens e apóstrofos internos
são aceitos. Cada pagante recebe avatar circular com iniciais e cor aleatória. A edição atualiza
iniciais e mantém a cor do avatar. A lista continua editável; associação de itens aos pagantes e
cálculo da divisão ainda não existem.
Os pagantes ficam apenas na página atual e não persistem após recarregar.
Leitura de QR Code por câmera e cobranças Pix também não estão implementadas.

## Próximos passos

1. Associar cada item comprado aos pagantes que o consumiram.
2. Calcular e exibir o valor devido por pagante e por item, incluindo divisão compartilhada.
3. Ler o QR Code da NFC-e diretamente pela câmera, além da consulta atual por link:
   - Em desktop, usar a webcam disponível.
   - Em acesso mobile, abrir a câmera do celular.
4. Apresentar resumo da divisão por pagante; integração com cobrança Pix pode vir depois.

A leitura pela câmera depende de permissão do usuário e, em navegadores, de contexto seguro
(HTTPS), exceto em endereços locais de desenvolvimento.

## Testes

Execute os testes de pagantes e itens com Node.js:

```powershell
node --test tests/participants.test.mjs tests/invoices.test.mjs
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
adicionar, editar e remover nomes sem atribuí-los aos produtos. Importe mais de uma nota;
cada nota fica em um painel expansível, abaixo da tabela consolidada, e começa recolhida após
importação. Os itens dentro de cada nota são somente leitura e não podem ser editados ou removidos.
Edite ou remova itens apenas na tabela consolidada; os dados originais da nota permanecem intactos.
Pagantes podem ser editados e removidos pelos ícones amarelo e vermelho, com tooltip. Nome e
sobrenome são validados no cadastro e na edição; avatares coloridos identificam pagantes para
associação futura aos itens.
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
