// Controlos do carrossel de fotografias.

// Elementos do carrossel e botões de navegação.
const galeria = document.getElementById('galeria');
const fotografias = document.querySelectorAll('.gallery-slide');
const indicadores = document.querySelectorAll('[data-foto]');
const botaoAnterior = document.getElementById('foto-anterior');
const botaoSeguinte = document.getElementById('foto-seguinte');
const contadorFotografias = document.getElementById('contador-fotos');
let indiceAtual = 0;

// Mostra uma fotografia de cada vez e atualiza os indicadores.
function mostrarFotografia(indice) {
    // Ao ultrapassar uma ponta do carrossel, passa para a outra.
    if (indice < 0) {
        indice = fotografias.length - 1;
    } else if (indice >= fotografias.length) {
        indice = 0;
    }
    indiceAtual = indice;

    for (let i = 0; i < fotografias.length; i++) {
        if (i === indiceAtual) {
            fotografias[i].hidden = false;
            indicadores[i].setAttribute('aria-pressed', 'true');
        } else {
            fotografias[i].hidden = true;
            indicadores[i].setAttribute('aria-pressed', 'false');
        }
    }

    const nome = fotografias[indiceAtual].querySelector('h2').textContent;
    contadorFotografias.textContent = indiceAtual + 1 + ' / ' + fotografias.length + ' · ' + nome;
}

function mostrarFotografiaAnterior() {
    mostrarFotografia(indiceAtual - 1);
}

function mostrarFotografiaSeguinte() {
    mostrarFotografia(indiceAtual + 1);
}

// Cada indicador guarda a posição da fotografia no atributo data-foto.
function escolherFotografia(evento) {
    const botao = evento.currentTarget;
    const indice = Number(botao.getAttribute('data-foto'));
    mostrarFotografia(indice);
}

// Permite usar as setas quando o foco está no carrossel.
function navegarComTeclado(evento) {
    if (evento.key === 'ArrowLeft') {
        evento.preventDefault();
        mostrarFotografiaAnterior();
    } else if (evento.key === 'ArrowRight') {
        evento.preventDefault();
        mostrarFotografiaSeguinte();
    }
}

// Se uma imagem falhar, a legenda e os botões continuam disponíveis.
function mostrarErroImagem(imagem) {
    imagem.hidden = true;
    const fotografia = imagem.parentElement;
    if (fotografia.querySelector('.gallery-image-error') !== null) {
        return;
    }

    const aviso = document.createElement('p');
    aviso.className = 'gallery-image-error';
    aviso.textContent =
        'Não foi possível carregar esta fotografia. Podes continuar a explorar a galeria.';
    fotografia.insertBefore(aviso, fotografia.firstChild);
}

function tratarErroImagem(evento) {
    mostrarErroImagem(evento.currentTarget);
}

// Associa os botões às funções que devem executar.
botaoAnterior.addEventListener('click', mostrarFotografiaAnterior);
botaoSeguinte.addEventListener('click', mostrarFotografiaSeguinte);
galeria.addEventListener('keydown', navegarComTeclado);

for (let i = 0; i < indicadores.length; i++) {
    indicadores[i].addEventListener('click', escolherFotografia);
}

for (let i = 0; i < fotografias.length; i++) {
    const imagem = fotografias[i].querySelector('img');
    imagem.addEventListener('error', tratarErroImagem);
    if (imagem.complete && imagem.naturalWidth === 0) {
        mostrarErroImagem(imagem);
    }
}

mostrarFotografia(0);
document.getElementById('controlos-galeria').hidden = false;
