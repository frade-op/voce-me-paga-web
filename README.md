# Você me paga — Web

Front-end simples (HTML, CSS e JS) que recebe a URL de uma NFC-e, consulta o serviço
[invoice-searcher-api](https://github.com/frade-op/invoice-searcher-api) e exibe os itens em uma tabela.

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

## Modo Caveman para assistentes de IA

As instruções do projeto ativam respostas sucintas sem perder conteúdo técnico. Use `/ultracave`
para respostas ainda mais curtas, `/megacave` para chinês clássico ou `stop caveman` para
desativar o modo. As regras ficam versionadas para GitHub Copilot, Cline, Cursor, OpenCode e
Windsurf; [AGENTS.md](AGENTS.md) contém a versão geral.

O modo só altera as respostas dos assistentes de IA. Não altera a aplicação nem exige bibliotecas
ou dependências de execução.
