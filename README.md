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
