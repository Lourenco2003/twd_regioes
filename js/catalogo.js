// Pesquisa e cartões das regiões costeiras.
(() => {
    'use strict';
    const { API_IPMA, obterJSON, mostrarCarregamento, mostrarErro } = window.MarUtils;
    const lista = document.querySelector('#regioes');
    const estado = document.querySelector('#estado');
    const pesquisa = document.querySelector('#pesquisa');
    const total = document.querySelector('#total');
    let regioes = [];

    // Remove acentos e diferenças entre maiúsculas e minúsculas.
    function normalizar(texto) {
        return texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    // Associa apenas as fotos: a lista de locais continua a vir do IPMA.
    const imagensRegioes = {
        faro: 'surf_faro.jpg',
        'figueira da foz': 'surf_figueira-da-foz.jpg',
        funchal: 'surf_funchal.jpg',
        horta: 'surf_horta.jpg',
        lisboa: 'surf_lisboa.jpg',
        'ponta delgada': 'surf_ponta_delgada.jpg',
        porto: 'surf_porto.jpg',
        'porto santo': 'surf_porto_santo.jpg',
        sagres: 'surf_sagres.jpg',
        'santa cruz das flores': 'surf_santa_cruz_das_flores.jpg',
        sines: 'surf_sines.jpg',
        'viana do castelo': 'surf_viana_do_castelo.jpg',
    };

    // Escolhe a fotografia local correspondente à região.
    function colocarFotografia(paisagem, regiao) {
        const nomeRegiao = normalizar(regiao.local.replace(/,\s*Costa\s*$/i, '').trim());
        const ficheiro = imagensRegioes[nomeRegiao];
        if (!ficheiro) return;
        const imagem = document.createElement('img');
        imagem.className = 'region-photo';
        imagem.alt = '';
        imagem.loading = 'lazy';
        imagem.decoding = 'async';
        imagem.addEventListener('load', () => paisagem.classList.add('has-photo'));
        // Mantém a ilustração em CSS se a fotografia falhar.
        imagem.addEventListener('error', () => {
            imagem.remove();
            paisagem.classList.remove('has-photo');
        });
        imagem.src = `images/${ficheiro}`;
        paisagem.append(imagem);
    }

    // Filtra os locais pela pesquisa e cria os cartões do catálogo.
    function apresentarRegioes() {
        lista.replaceChildren();
        const encontradas = regioes.filter((regiao) =>
            normalizar(regiao.local).includes(normalizar(pesquisa.value.trim())),
        );
        total.textContent = encontradas.length;
        estado.hidden = encontradas.length > 0;
        estado.textContent = 'Não foram encontradas regiões para esta pesquisa.';
        encontradas.forEach((regiao) => {
            const coluna = document.createElement('div');
            coluna.className = 'col-md-6 col-lg-4';
            const cartao = document.createElement('article');
            cartao.className = 'card region-card';
            const paisagem = document.createElement('div');
            paisagem.className = `card-landscape${Number(regiao.idRegiao) > 1 ? ' islands' : ''}`;
            paisagem.setAttribute('aria-hidden', 'true');
            colocarFotografia(paisagem, regiao);
            const corpo = document.createElement('div');
            corpo.className = 'card-body';
            const categoria = document.createElement('span');
            categoria.className = 'region-category';
            categoria.textContent = 'COSTA PORTUGUESA';
            const nome = document.createElement('h2');
            nome.textContent = regiao.local.replace(/,\s*Costa\s*$/i, '');
            const coordenadas = document.createElement('p');
            coordenadas.className = 'region-coords';
            coordenadas.textContent = `${regiao.latitude}° lat · ${regiao.longitude}° lon`;
            // Envia os dados da região para a página de detalhes.
            const parametros = new URLSearchParams({
                lat: regiao.latitude,
                lon: regiao.longitude,
                local: regiao.local,
                id: regiao.globalIdLocal ?? '',
                idLocal: regiao.idLocal ?? '',
                aviso: regiao.idAreaAviso ?? '',
            });
            const link = document.createElement('a');
            link.className = 'region-link';
            link.href = `detalhes.html?${parametros}`;
            link.append(document.createTextNode('Ver condições'));
            const seta = document.createElement('span');
            seta.textContent = '→';
            seta.setAttribute('aria-hidden', 'true');
            link.append(seta);
            link.setAttribute('aria-label', `Ver condições — ${regiao.local}`);
            corpo.append(categoria, nome, coordenadas, link);
            cartao.append(paisagem, corpo);
            coluna.append(cartao);
            lista.append(coluna);
        });
    }

    // Obtém os locais do IPMA e ordena-os alfabeticamente.
    async function carregarRegioes() {
        estado.hidden = false;
        mostrarCarregamento(estado);
        pesquisa.disabled = true;
        try {
            const dados = await obterJSON(`${API_IPMA}sea-locations.json`);
            const locais = Array.isArray(dados) ? dados : dados.data;
            if (!Array.isArray(locais)) throw new Error('Formato inesperado do IPMA.');
            regioes = locais.filter((regiao) => typeof regiao.local === 'string');
            regioes.sort((a, b) => a.local.localeCompare(b.local, 'pt-PT'));
            pesquisa.disabled = false;
            apresentarRegioes();
        } catch (erro) {
            console.error('Catálogo:', erro);
            mostrarErro(estado, carregarRegioes);
        }
    }

    // Pesquisa e carregamento inicial.
    pesquisa.addEventListener('input', apresentarRegioes);
    carregarRegioes();
})();
