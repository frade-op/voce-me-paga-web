// Ambiente ativo: "local" | "test" | "prod"
const ENV = "local";

const API_URLS = {
  local: "http://127.0.0.1:8000",
  test: "https://TROCAR-PELO-AMBIENTE-DE-TESTE.herokuapp.com",
  prod: "https://invoice-searcher-api-ee52c609bc5d.herokuapp.com",
};

window.API_BASE_URL = API_URLS[ENV];
