# vc me paga — Web

Front-end estático em HTML, CSS e JS para consultar uma NFC-e pelo link do QR Code.
O app chama [invoice-searcher-api](https://github.com/frade-op/invoice-searcher-api) e exibe
os dados, itens e pagamentos identificados na nota.

**Assinatura:** “A nota lida. A conta dividida.”

## Identidade visual

- Logo: [images/logo.png](images/logo.png), exibida inteira em proporção quadrada no cabeçalho.
- Verde ação: `#22C55E` e `#10B981`, usado no botão principal e nos destaques.
- Verdes de confiança: `#064E3B` e `#022C22`, usados no cabeçalho e em títulos.
- Fundo neutro: `#F9FAFB`; cartões usam branco para manter leitura clara.
- Tipografia: Inter com fallback para fontes sans-serif do sistema.
- Tom de voz: direto, informal e focado em facilitar a divisão da conta.

## Estado do produto

Hoje, o fluxo consulta uma nota por URL e lista os dados retornados pela API.
O cadastro, a edição e a remoção de pagantes já funcionam antes ou depois da consulta da nota.
A lista continua editável; cálculo de valores e divisão de itens ainda não existem.
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

Execute os testes do gerenciamento de pagantes com Node.js:

```powershell
node --test tests/participants.test.mjs
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
visível para navegação por teclado. O cadastro de pagantes aparece antes da consulta da nota e
permite adicionar, editar e remover nomes sem atribuí-los aos produtos. O logo fica em
`images/logo.png`; preserve esse caminho ao
publicar o front-end.

## Modo Caveman para assistentes de IA

As instruções do projeto ativam respostas sucintas sem perder conteúdo técnico. Use `/ultracave`
para respostas ainda mais curtas, `/megacave` para chinês clássico ou `stop caveman` para
desativar o modo. As regras ficam versionadas para GitHub Copilot, Cline, Cursor, OpenCode e
Windsurf; [AGENTS.md](AGENTS.md) contém a versão geral.

O modo só altera as respostas dos assistentes de IA. Não altera a aplicação nem exige bibliotecas
ou dependências de execução.
