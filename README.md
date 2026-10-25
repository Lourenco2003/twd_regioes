# Searching

Aplicação académica para consultar o tempo e o mar na costa portuguesa. Usa HTML, CSS, JavaScript puro, Bootstrap 5 por CDN e Fetch API. Não precisa de npm, backend, base de dados ou chaves de API.

## Executar

Abrir a pasta no VS Code e usar **Open with Live Server** em `index.html`.

Em alternativa, executar na pasta do projeto:

```sh
python3 -m http.server 8000
```

Abrir `http://localhost:8000`. É necessária Internet para consultar as APIs e carregar o Bootstrap. Recomenda-se um servidor HTTP; abrir o HTML diretamente pode limitar os pedidos às APIs.

## Ficheiros

- `index.html`: página inicial, com a fotografia `surf_espinho.jpg`.
- `catalogo.html` e `js/catalogo.js`: locais do IPMA, pesquisa, fotografias e links para os detalhes.
- `detalhes.html` e `js/detalhes.js`: atmosfera, mar Open-Meteo e previsão oficial do IPMA.
- `galeria.html` e `js/galeria.js`: fotografias com setas, indicadores e navegação pelo teclado.
- `js/utils.js`: pedidos HTTP, formatação e mensagens de carregamento e erro.
- `js/regioes.js`: textos de apresentação, zona geográfica e fotografias das 12 regiões.
- `css/style.css`: estilos por secção e adaptações a diferentes ecrãs.
- `images/`: fotografias e ícone locais.
- `tests/`: testes opcionais de desenvolvimento; instruções em `tests/README.md`.

## Dados

O catálogo obtém os locais e as coordenadas do IPMA, sem uma lista fixa de regiões. Os links enviam esses dados pela URL para a página de detalhes.

A Open-Meteo fornece as condições atuais da atmosfera e os dados horários do mar. A aplicação escolhe a hora marítima mais recente, não futura e com menos de duas horas. Os timestamps Unix e o fuso da região evitam depender do fuso do computador.

O IPMA mostra a previsão diária de hoje por defeito, com filtros para os dois dias seguintes. Os intervalos diários não representam o mesmo período que o valor horário da Open-Meteo. As três consultas têm erros independentes; valores ausentes aparecem como **N/D**.

Os pedidos têm um limite de 20 segundos. Se a API marítima rejeitar o pedido com HTTP 400, a aplicação tenta uma vez sem a temperatura da superfície do mar. As direções mantêm a convenção de proveniência das fontes.

## Fotografias e galeria

A lista de apresentação em `js/regioes.js` associa os nomes às fotografias em `images/`, à zona geográfica e a um texto breve. É usada pelo catálogo e pelos detalhes; para alterar um texto ou uma foto, editar a entrada da região nesse ficheiro. Se uma imagem falhar, o cartão mantém a ilustração alternativa em CSS.

As fotografias da galeria são definidas em `galeria.html`. O carrossel não avança automaticamente: usa as setas, os indicadores ou o teclado quando tem foco. Todas as imagens ocupam a mesma área, até **1200 × 600 px** no computador e proporção **4:3** no telemóvel. `object-fit: cover` recorta sem deformar.

## Fontes

- [IPMA](https://api.ipma.pt/): locais costeiros e previsão marítima oficial.
- [Open-Meteo](https://open-meteo.com/): meteorologia e [previsão marítima](https://open-meteo.com/en/docs/marine-weather-api); dados sob CC BY 4.0.
- [Bootstrap 5.3.3](https://getbootstrap.com/): estilos carregados de `cdn.jsdelivr.net`, licença MIT.

Respeitar as condições de utilização e os limites dos fornecedores. As previsões não substituem os avisos oficiais ou a avaliação das condições locais.

Nos detalhes, cada região apresenta a fotografia à esquerda e o texto à direita. As fotografias usam a mesma área de **480 × 360 px** no computador, com proporção **4:3** adaptada a ecrãs menores. `object-fit: cover` recorta sem deformar. Os textos são descrições gerais da região, independentes das previsões das APIs.

## Como ler o JavaScript

Os ficheiros usam código direto, sem funções executadas imediatamente nem objetos como `window.MarUtils`. As funções são declaradas com `function`, as listas são percorridas com `for` e as decisões usam `if/else`. `const` guarda referências que não são reatribuídas e `let` é usado para valores que mudam.

Nos ficheiros de cada página, as últimas linhas associam os botões às funções e iniciam o carregamento. O atributo `defer` no HTML garante que os elementos da página já existem quando o JavaScript é executado. No catálogo e nos detalhes, `regioes.js` e `utils.js` são carregados antes do ficheiro da página.

`fetch` obtém os dados das APIs. `async` permite usar `await` para esperar por uma resposta, e `try/catch` trata os erros. O cancelamento após 20 segundos usa `AbortController`. Nos detalhes, um contador mantém o botão de atualização desativado até todas as consultas terminarem.
