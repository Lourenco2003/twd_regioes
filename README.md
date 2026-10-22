# Estado do Mar Portugal

Aplicação académica estática, em português, para consultar o tempo e o estado do mar na costa portuguesa. HTML5, CSS, JavaScript puro, Bootstrap 5 por CDN e Fetch API. Sem npm, frameworks JavaScript, backend, base de dados ou chaves de API.

## Executar

1. Extrair o ZIP.
2. Abrir a pasta no Visual Studio Code.
3. Usar a extensão **Live Server** e abrir `index.html` com **Open with Live Server**.

Alternativamente, com Python instalado, executar na pasta do projeto:

```sh
python3 -m http.server 8000
```

Abrir `http://localhost:8000`. Usar um servidor HTTP: não abrir com `file://`, porque o JavaScript usa módulos. É necessária ligação à Internet para as APIs e para o Bootstrap. Não é necessário instalar dependências da aplicação. Existe CSS local de apoio à apresentação caso a CDN falhe.

## Organização

- `index.html`: entrada com imagem vetorial local do oceano e acesso ao catálogo.
- `catalogo.html` / `js/catalogo.js`: obtém todos os locais de `https://api.ipma.pt/open-data/sea-locations.json`, ordena-os e permite pesquisar sem acentos.
- `detalhes.html` / `js/detalhes.js`: recebe coordenadas, nome e identificadores do IPMA pela URL. Consulta as APIs meteorológica e marítima em paralelo, com erros independentes.
- `js/utils.js`: Fetch com limite de 20 segundos, formatação, códigos WMO, pontos cardeais, escolha da hora atual e acesso às previsões IPMA.
- `css/style.css`: apresentação e adaptações para telemóvel.
- `images/`: ilustração SVG original e ícone local, sem dependências de imagens externas.
- `tests/`: testes opcionais de desenvolvimento; não são necessários para utilizar a aplicação.

## Dados e decisões

**IPMA:** os locais, coordenadas, `globalIdLocal`, `idLocal` e `idAreaAviso` vêm da API. Não existe lista fixa nem dados demonstrativos na aplicação. A secção opcional de detalhes consulta as previsões marítimas oficiais de hoje, amanhã ou depois de amanhã e apresenta os registos correspondentes com os nomes originais dos campos, sem os confundir com as observações horárias.

**Open-Meteo Weather:** temperatura, humidade, precipitação, código meteorológico WMO, velocidade/direção do vento e rajadas em `current`. Velocidade em km/h.

**Open-Meteo Marine:** ondas totais, swell, ondas de vento e temperatura da superfície do mar em `hourly`, com `cell_selection=sea`. Seleciona a hora mais recente não posterior ao instante atual, com menos de duas horas de diferença. Timestamps Unix permitem selecionar a hora sem depender do fuso do computador. `timezone=auto` apresenta a hora local da região, incluindo Açores.

Se o servidor rejeitar o pedido marítimo com HTTP 400, tenta uma vez sem a temperatura da superfície do mar, que pode não ser suportada. Valores ausentes, nulos ou inválidos são **N/D**, nunca zero inventado. As direções são N, NE, E, SE, S, SW, W e NW. A direção segue a convenção da fonte (direção de proveniência).

A hora apresentada é a hora de validade dos dados do modelo, não uma alegada medição local nem a hora de publicação. As coordenadas exibidas pertencem ao local IPMA; a Open-Meteo pode selecionar uma célula marítima próxima.

Falhas HTTP, de ligação ou de CORS mostram uma mensagem e um botão para repetir. Não é possível contornar CORS no frontend: se um fornecedor alterar a sua política, é necessária uma alteração do fornecedor ou uma revisão da arquitetura. Não há proxy ou backend neste projeto.

## Fontes e limites

- IPMA: https://api.ipma.pt/ (dados e condições de utilização do IPMA).
- Open-Meteo: https://open-meteo.com/ e https://open-meteo.com/en/docs/marine-weather-api (atribuição e condições atuais do fornecedor; dados Open-Meteo sob CC BY 4.0).
- Bootstrap 5.3.3: https://getbootstrap.com/ (MIT), carregado de `cdn.jsdelivr.net`.

O acesso gratuito às APIs está sujeito às condições e limites dos fornecedores. As previsões não substituem avisos oficiais nem a avaliação das condições locais. A aplicação não calcula se é seguro nadar ou surfar.

## Verificação

Os testes opcionais documentados em `tests/README.md` usam respostas simuladas e não devem ser confundidos com uma consulta real às APIs. Foram obtidas respostas reais dos quatro endpoints: 12 locais IPMA, previsão marítima oficial, tempo e condições marítimas Open-Meteo. A aplicação entregue mantém os URLs reais, sem dados simulados. O navegador depende do acesso HTTPS e da política CORS dos fornecedores.

### Resultado da validação nesta entrega

Sete testes Playwright passaram. O fluxo com respostas reais apresentou os 12 locais e os dados meteorológicos, marítimos e oficiais da Figueira da Foz. O Chromium do ambiente não reconheceu a autoridade certificadora do proxy; nessa verificação funcional, os pedidos HTTPS reais foram encaminhados pelo transporte Python com validação TLS ativa. Não se desativou a verificação de certificados. A execução direta no navegador do utilizador continua dependente da sua ligação e da política CORS dos fornecedores.
