// Fotografias e textos de apresentação das regiões; os locais continuam a vir do IPMA.
(() => {
    'use strict';
    const regioes = [
        {
            nome: 'Faro',
            imagem: 'surf_faro.jpg',
            zona: 'Algarve · Continente',
            descricao:
                'Na costa de Faro, o Atlântico encontra as ilhas e os canais da Ria Formosa. Os extensos areais e a paisagem lagunar marcam esta região do Algarve, onde o mar faz parte do quotidiano.',
        },
        {
            nome: 'Figueira da Foz',
            imagem: 'surf_figueira-da-foz.jpg',
            zona: 'Coimbra · Centro',
            descricao:
                'Na foz do rio Mondego, a Figueira da Foz abre-se para o Atlântico com praias de areal amplo. A serra da Boa Viagem e a ligação à pesca dão identidade a esta região da costa centro.',
        },
        {
            nome: 'Funchal',
            imagem: 'surf_funchal.jpg',
            zona: 'Ilha da Madeira · Costa sul',
            descricao:
                'Entre as encostas da Madeira e o oceano, o Funchal acompanha uma baía voltada a sul. A sua costa combina zonas rochosas, acessos ao mar e uma paisagem marcada pela origem vulcânica da ilha.',
        },
        {
            nome: 'Horta',
            imagem: 'surf_horta.jpg',
            zona: 'Ilha do Faial · Açores',
            descricao:
                'Na ilha do Faial, a Horta tem uma forte ligação à navegação e à vida no Atlântico. A marina, as baías e a vista para a ilha do Pico fazem parte da paisagem desta região açoriana.',
        },
        {
            nome: 'Lisboa',
            imagem: 'surf_lisboa.jpg',
            zona: 'Região de Lisboa · Continente',
            descricao:
                'Na região de Lisboa, o encontro do Tejo com o Atlântico liga a paisagem urbana à costa. Nos arredores, praias e trechos de falésia oferecem diferentes formas de conhecer o litoral.',
        },
        {
            nome: 'Ponta Delgada',
            imagem: 'surf_ponta_delgada.jpg',
            zona: 'Ilha de São Miguel · Açores',
            descricao:
                'Na costa sul de São Miguel, Ponta Delgada mantém uma ligação próxima ao oceano. O litoral de origem vulcânica, os portos e os acessos ao mar enquadram a maior cidade dos Açores.',
        },
        {
            nome: 'Porto',
            imagem: 'surf_porto.jpg',
            zona: 'Porto · Norte',
            descricao:
                'Junto à foz do Douro, o Porto prolonga a sua paisagem até ao Atlântico. Praias urbanas, rochedos e passeios à beira-mar caracterizam uma costa onde a cidade convive com a ondulação do oceano.',
        },
        {
            nome: 'Porto Santo',
            imagem: 'surf_porto_santo.jpg',
            zona: 'Ilha de Porto Santo · Madeira',
            descricao:
                'O Porto Santo distingue-se pelo extenso areal dourado da sua costa sul. Entre o mar e uma paisagem de tons claros, a praia ocupa um lugar central na identidade desta ilha do arquipélago da Madeira.',
        },
        {
            nome: 'Sagres',
            imagem: 'surf_sagres.jpg',
            zona: 'Vila do Bispo · Algarve',
            descricao:
                'No sudoeste do Algarve, Sagres é marcada por falésias e praias expostas ao Atlântico. A proximidade entre a costa sul e a costa ocidental cria uma paisagem variada, com uma forte ligação ao mar e ao surf.',
        },
        {
            nome: 'Santa Cruz das Flores',
            imagem: 'surf_santa_cruz_das_flores.jpg',
            zona: 'Ilha das Flores · Açores',
            descricao:
                'Na costa oriental da ilha das Flores, Santa Cruz aproxima o casario do oceano. A costa rochosa, as piscinas naturais e a vegetação envolvente refletem a paisagem atlântica do grupo ocidental dos Açores.',
        },
        {
            nome: 'Sines',
            imagem: 'surf_sines.jpg',
            zona: 'Alentejo Litoral · Continente',
            descricao:
                'Na costa alentejana, Sines reúne uma baía urbana, um porto e uma longa tradição marítima. Nos arredores, o litoral alterna praias, dunas e zonas rochosas abertas ao Atlântico.',
        },
        {
            nome: 'Viana do Castelo',
            imagem: 'surf_viana_do_castelo.jpg',
            zona: 'Viana do Castelo · Norte',
            descricao:
                'Entre a foz do Lima e o Atlântico, Viana do Castelo tem uma costa marcada por praias, dunas e paisagens verdes. A pesca e a ligação da cidade ao mar fazem parte da identidade do litoral minhoto.',
        },
    ];

    // Aceita os nomes do IPMA com ou sem acentos e com o sufixo Costa.
    function obterRegiao(nome) {
        const normalizar = (texto) =>
            texto
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
        const chave = normalizar(nome.replace(/,\s*Costa\s*$/i, '').trim());
        return regioes.find((regiao) => normalizar(regiao.nome) === chave) || null;
    }

    window.Regioes = Object.freeze({ obter: obterRegiao });
})();
