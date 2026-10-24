/**
 * catalogo.js — código explicado para estudo.
 * Fluxo: carregar os locais do IPMA, ordenar, filtrar pela pesquisa e criar os cartões.
 * Os links dos cartões enviam coordenadas e identificadores para detalhes.html.
 * A indentação mostra os blocos; uma chaveta de fecho termina o bloco correspondente.
 */
// Executa imediatamente esta função; as suas variáveis ficam isoladas dos outros ficheiros.
(() => {
    // Ativa o modo estrito, que ajuda a detetar erros como variáveis usadas sem declaração.
    'use strict';
    // Obtém as funções partilhadas já carregadas por utils.js; as chavetas selecionam propriedades
    // do objeto MarUtils.
    const { API_IPMA, obterJSON, mostrarCarregamento, mostrarErro } = window.MarUtils;
    // Guarda em lista o elemento HTML identificado por #regioes, para o consultar ou atualizar
    // mais à frente.
    const lista = document.querySelector('#regioes');
    // Guarda em estado o elemento HTML identificado por #estado, para o consultar ou atualizar
    // mais à frente.
    const estado = document.querySelector('#estado');
    // Guarda em pesquisa o elemento HTML identificado por #pesquisa, para o consultar ou atualizar
    // mais à frente.
    const pesquisa = document.querySelector('#pesquisa');
    // Guarda em total o elemento HTML identificado por #total, para o consultar ou atualizar mais
    // à frente.
    const total = document.querySelector('#total');
    // Guarda a lista recebida do IPMA; começa vazia até o pedido terminar.
    let regioes = [];

    // Remove acentos e converte para minúsculas, permitindo pesquisar São através de sao.
    function normalizar(texto) {
        // Separa os acentos das letras, remove esses acentos e converte o texto para minúsculas.
        return texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    // Filtra os locais pela pesquisa e constrói os cartões do catálogo a partir dos dados do IPMA.
    function apresentarRegioes() {
        // Remove o conteúdo anterior de lista para preparar a nova apresentação.
        lista.replaceChildren();
        // Mantém apenas regiões cujo nome contém o texto pesquisado, ignorando espaços exteriores,
        // acentos e maiúsculas.
        const encontradas = regioes.filter((regiao) =>
            normalizar(regiao.local).includes(normalizar(pesquisa.value.trim())),
        );
        // Atualiza o contador com o número de cartões que serão apresentados.
        total.textContent = encontradas.length;
        // Oculta a mensagem de estado quando a pesquisa tem resultados.
        estado.hidden = encontradas.length > 0;
        // Prepara a mensagem mostrada quando nenhum nome corresponde à pesquisa.
        estado.textContent = 'Não foram encontradas regiões para esta pesquisa.';
        // Cria um cartão por cada região encontrada; regiao representa o local desta passagem.
        encontradas.forEach((regiao) => {
            // Cria o elemento 'div' e guarda-o em coluna; ainda não é visível até ser inserido no
            // documento.
            const coluna = document.createElement('div');
            // Aplica as classes col-md-6 col-lg-4 a coluna, associando a apresentação definida no
            // CSS e/ou no Bootstrap.
            coluna.className = 'col-md-6 col-lg-4';
            // Cria o elemento 'article' e guarda-o em cartao; ainda não é visível até ser inserido
            // no documento.
            const cartao = document.createElement('article');
            // Aplica as classes card region-card a cartao, associando a apresentação definida no
            // CSS e/ou no Bootstrap.
            cartao.className = 'card region-card';
            // Cria o elemento 'div' e guarda-o em paisagem; ainda não é visível até ser inserido
            // no documento.
            const paisagem = document.createElement('div');
            // Aplica a ilustração do cartão e uma variante para regiões insulares (idRegiao
            // superior a 1).
            paisagem.className = `card-landscape${Number(regiao.idRegiao) > 1 ? ' islands' : ''}`;
            // Oculta paisagem dos leitores de ecrã porque este elemento é apenas decorativo.
            paisagem.setAttribute('aria-hidden', 'true');
            // Cria o elemento 'div' e guarda-o em corpo; ainda não é visível até ser inserido no
            // documento.
            const corpo = document.createElement('div');
            // Aplica as classes card-body a corpo, associando a apresentação definida no CSS e/ou
            // no Bootstrap.
            corpo.className = 'card-body';
            // Cria o elemento 'span' e guarda-o em categoria; ainda não é visível até ser inserido
            // no documento.
            const categoria = document.createElement('span');
            // Aplica as classes region-category a categoria, associando a apresentação definida no
            // CSS e/ou no Bootstrap.
            categoria.className = 'region-category';
            // Define o texto de categoria como 'COSTA PORTUGUESA', sem interpretar esse conteúdo
            // como HTML.
            categoria.textContent = 'COSTA PORTUGUESA';
            // Cria o elemento 'h2' e guarda-o em nome; ainda não é visível até ser inserido no
            // documento.
            const nome = document.createElement('h2');
            // Remove apenas o sufixo Costa, se existir, para tornar o título do cartão mais curto.
            nome.textContent = regiao.local.replace(/,\s*Costa\s*$/i, '');
            // Cria o elemento 'p' e guarda-o em coordenadas; ainda não é visível até ser inserido
            // no documento.
            const coordenadas = document.createElement('p');
            // Aplica as classes region-coords a coordenadas, associando a apresentação definida no
            // CSS e/ou no Bootstrap.
            coordenadas.className = 'region-coords';
            // Mostra a latitude e a longitude fornecidas pelo IPMA.
            coordenadas.textContent = `${regiao.latitude}° lat · ${regiao.longitude}° lon`;
            // Começa os parâmetros da página de detalhes com as coordenadas recebidas da API.
            const parametros = new URLSearchParams({
                lat: regiao.latitude,
                lon: regiao.longitude,
                // Inclui nome e identificadores; ?? usa texto vazio apenas se um identificador for
                // null ou undefined.
                local: regiao.local,
                id: regiao.globalIdLocal ?? '',
                idLocal: regiao.idLocal ?? '',
                // Acrescenta a área de aviso e termina os parâmetros; URLSearchParams trata a
                // codificação dos caracteres.
                aviso: regiao.idAreaAviso ?? '',
            });
            // Cria o elemento 'a' e guarda-o em link; ainda não é visível até ser inserido no
            // documento.
            const link = document.createElement('a');
            // Aplica as classes region-link a link, associando a apresentação definida no CSS e/ou
            // no Bootstrap.
            link.className = 'region-link';
            // Define a navegação para os detalhes, transportando os dados do local na URL.
            link.href = `detalhes.html?${parametros}`;
            // Insere o texto clicável do cartão como texto simples.
            link.append(document.createTextNode('Ver condições'));
            // Cria o elemento 'span' e guarda-o em seta; ainda não é visível até ser inserido no
            // documento.
            const seta = document.createElement('span');
            // Define o texto de seta como '→', sem interpretar esse conteúdo como HTML.
            seta.textContent = '→';
            // Oculta seta dos leitores de ecrã porque este elemento é apenas decorativo.
            seta.setAttribute('aria-hidden', 'true');
            // Insere seta dentro de link, pela ordem indicada.
            link.append(seta);
            // Dá ao link um nome completo para quem navega com um leitor de ecrã.
            link.setAttribute('aria-label', `Ver condições — ${regiao.local}`);
            // Insere categoria, nome, coordenadas, link dentro de corpo, pela ordem indicada.
            corpo.append(categoria, nome, coordenadas, link);
            // Insere paisagem, corpo dentro de cartao, pela ordem indicada.
            cartao.append(paisagem, corpo);
            // Insere cartao dentro de coluna, pela ordem indicada.
            coluna.append(cartao);
            // Insere coluna dentro de lista, pela ordem indicada.
            lista.append(coluna);
        });
    }

    // Carrega os locais do IPMA, valida o formato e apresenta o catálogo ou uma mensagem de erro.
    async function carregarRegioes() {
        // Torna visível a área que apresenta carregamento, ausência de resultados ou erro.
        estado.hidden = false;
        // Mostra o estado A carregar dados na área estado antes de iniciar o pedido.
        mostrarCarregamento(estado);
        // Impede pesquisar enquanto ainda não existe uma lista de locais carregada.
        pesquisa.disabled = true;
        // Começa o bloco protegido: os erros lançados aqui serão tratados por catch ou seguidos da
        // limpeza em finally.
        try {
            // Espera pela lista de locais costeiros obtida diretamente do IPMA.
            const dados = await obterJSON(`${API_IPMA}sea-locations.json`);
            // Aceita tanto uma lista diretamente no JSON como uma lista dentro da propriedade
            // data.
            const locais = Array.isArray(dados) ? dados : dados.data;
            // Confirma a existência de uma lista antes de tentar percorrê-la.
            if (!Array.isArray(locais)) throw new Error('Formato inesperado do IPMA.');
            // Ignora entradas que não tenham o nome do local em formato de texto.
            regioes = locais.filter((regiao) => typeof regiao.local === 'string');
            // Ordena os nomes alfabeticamente usando as regras do português.
            regioes.sort((a, b) => a.local.localeCompare(b.local, 'pt-PT'));
            // Ativa a caixa de pesquisa depois de os dados terem sido carregados.
            pesquisa.disabled = false;
            // Desenha os cartões com base na lista e na pesquisa atuais.
            apresentarRegioes();
        } catch (erro) {
            // Recebe erros do pedido ou da validação para evitar que a interface fique sem
            // explicação.
            // Regista os detalhes do erro na consola para diagnosticar problemas na secção
            // Catálogo.
            console.error('Catálogo:', erro);
            // Mostra um erro na área estado e permite repetir através da função carregarRegioes.
            mostrarErro(estado, carregarRegioes);
        }
    }
    // Volta a filtrar os cartões sempre que o utilizador escreve ou apaga texto na pesquisa.
    pesquisa.addEventListener('input', apresentarRegioes);
    // Inicia o primeiro carregamento do catálogo assim que o ficheiro é executado.
    carregarRegioes();
})();
