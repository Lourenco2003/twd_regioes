# Testes opcionais

Requer Python e Playwright apenas na máquina de desenvolvimento, não na aplicação:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
```

Com o servidor da aplicação ativo na porta 8000 (`python3 -m http.server 8000`, na raiz do projeto), executar noutro terminal:

```sh
python3 -m unittest discover -s tests -v
```

As respostas IPMA/Open-Meteo são simuladas exclusivamente nos testes. Verificam navegação, pesquisa, hora selecionada, valores ausentes, direções, falhas independentes, repetição, fallback marítimo, parâmetros inválidos, ordem horizontal das secções, carregamento automático do IPMA, filtros dos três dias e ausência de overflow em ecrãs de 390, 768 e 1440 px. A CDN é bloqueada nos testes para verificar também o CSS de apoio. Não comprovam acesso às APIs reais.

A galeria é verificada quanto a navegação pelos botões, passagem circular da primeira para a última imagem, indicadores, setas do teclado, acesso ao catálogo, adaptação a ecrãs entre 320 e 1440 px e recuperação quando uma imagem não carrega.

Os detalhes das 12 regiões são verificados quanto a texto próprio, fotografia correspondente e tamanho uniforme de 480 × 360 px no computador, com proporção 4:3 em ecrãs menores.
