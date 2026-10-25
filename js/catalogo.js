// Carregamento, pesquisa e cartões do catálogo.
'use strict';

const listaRegioes = document.getElementById('regioes');
const estadoCatalogo = document.getElementById('estado');
const pesquisaRegioes = document.getElementById('pesquisa');
const totalRegioes = document.getElementById('total');
let regioesCatalogo = [];

function mostrarFotografiaCartao(evento) {
    const imagem = evento.currentTarget;
    imagem.parentElement.classList.add('has-photo');
}

function retirarFotografiaCartao(evento) {
    const imagem = evento.currentTarget;
    imagem.parentElement.classList.remove('has-photo');
    imagem.remove();
}

function colocarFotografia(paisagem, regiao) {
    const apresentacao = obterRegiao(regiao.local);
    if (apresentacao === null) {
        return;
    }

    const imagem = document.createElement('img');
    imagem.className = 'region-photo';
    imagem.alt = '';
    imagem.loading = 'lazy';
    imagem.decoding = 'async';
    imagem.addEventListener('load', mostrarFotografiaCartao);
    imagem.addEventListener('error', retirarFotografiaCartao);
    paisagem.appendChild(imagem);
    imagem.src = 'images/' + apresentacao.imagem;
}

// Evita enviar a palavra undefined quando um identificador está ausente.
function valorParaURL(valor) {
    if (valor === undefined || valor === null) {
        return '';
    }
    return valor;
}

function criarLinkRegiao(regiao) {
    const parametros = new URLSearchParams();
    parametros.set('lat', regiao.latitude);
    parametros.set('lon', regiao.longitude);
    parametros.set('local', regiao.local);
    parametros.set('id', valorParaURL(regiao.globalIdLocal));
    parametros.set('idLocal', valorParaURL(regiao.idLocal));
    parametros.set('aviso', valorParaURL(regiao.idAreaAviso));

    const link = document.createElement('a');
    link.className = 'region-link';
    link.href = 'detalhes.html?' + parametros.toString();
    link.textContent = 'Ver condições';
    link.setAttribute('aria-label', 'Ver condições — ' + regiao.local);

    const seta = document.createElement('span');
    seta.textContent = '→';
    seta.setAttribute('aria-hidden', 'true');
    link.appendChild(seta);
    return link;
}

// Cada cartão é criado com os dados de um local devolvido pelo IPMA.
function criarCartaoRegiao(regiao) {
    const coluna = document.createElement('div');
    coluna.className = 'col-md-6 col-lg-4';

    const cartao = document.createElement('article');
    cartao.className = 'card region-card';

    const paisagem = document.createElement('div');
    paisagem.className = 'card-landscape';
    if (Number(regiao.idRegiao) > 1) {
        paisagem.classList.add('islands');
    }
    paisagem.setAttribute('aria-hidden', 'true');
    colocarFotografia(paisagem, regiao);

    const corpo = document.createElement('div');
    corpo.className = 'card-body';

    const categoria = document.createElement('span');
    categoria.className = 'region-category';
    categoria.textContent = 'COSTA PORTUGUESA';

    const nome = document.createElement('h2');
    nome.textContent = limparNomeRegiao(regiao.local);

    const coordenadas = document.createElement('p');
    coordenadas.className = 'region-coords';
    coordenadas.textContent = regiao.latitude + '° lat · ' + regiao.longitude + '° lon';

    corpo.appendChild(categoria);
    corpo.appendChild(nome);
    corpo.appendChild(coordenadas);
    corpo.appendChild(criarLinkRegiao(regiao));
    cartao.appendChild(paisagem);
    cartao.appendChild(corpo);
    coluna.appendChild(cartao);
    return coluna;
}

function apresentarRegioes() {
    listaRegioes.textContent = '';
    const pesquisa = normalizarNome(pesquisaRegioes.value.trim());
    let encontradas = 0;

    for (let i = 0; i < regioesCatalogo.length; i++) {
        const regiao = regioesCatalogo[i];
        const nome = normalizarNome(regiao.local);
        if (nome.includes(pesquisa)) {
            listaRegioes.appendChild(criarCartaoRegiao(regiao));
            encontradas = encontradas + 1;
        }
    }

    totalRegioes.textContent = encontradas;
    if (encontradas > 0) {
        estadoCatalogo.hidden = true;
    } else {
        estadoCatalogo.hidden = false;
        estadoCatalogo.textContent = 'Não foram encontradas regiões para esta pesquisa.';
    }
}

function ordenarRegioes(primeira, segunda) {
    return primeira.local.localeCompare(segunda.local, 'pt-PT');
}

async function carregarRegioes() {
    estadoCatalogo.hidden = false;
    mostrarCarregamento(estadoCatalogo);
    pesquisaRegioes.disabled = true;

    try {
        const dados = await obterJSON(API_IPMA + 'sea-locations.json');
        let locais;
        if (Array.isArray(dados)) {
            locais = dados;
        } else {
            locais = dados.data;
        }
        if (!Array.isArray(locais)) {
            throw new Error('Formato inesperado do IPMA.');
        }

        regioesCatalogo = [];
        for (let i = 0; i < locais.length; i++) {
            if (typeof locais[i].local === 'string') {
                regioesCatalogo.push(locais[i]);
            }
        }
        regioesCatalogo.sort(ordenarRegioes);
        pesquisaRegioes.disabled = false;
        apresentarRegioes();
    } catch (erro) {
        console.error('Catálogo:', erro);
        mostrarErro(estadoCatalogo, carregarRegioes);
    }
}

pesquisaRegioes.addEventListener('input', apresentarRegioes);
carregarRegioes();
