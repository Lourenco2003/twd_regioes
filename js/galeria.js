// Navegação pelo carrossel de fotografias locais.
(() => {
    'use strict';
    const galeria = document.querySelector('#galeria');
    const fotografias = [...document.querySelectorAll('.gallery-slide')];
    const indicadores = [...document.querySelectorAll('[data-foto]')];
    const anterior = document.querySelector('#foto-anterior');
    const seguinte = document.querySelector('#foto-seguinte');
    const contador = document.querySelector('#contador-fotos');
    let indiceAtual = 0;

    // Atualiza a fotografia visível, os indicadores e o contador.
    function mostrarFotografia(indice) {
        // Permite passar da última fotografia para a primeira e vice-versa.
        indiceAtual = (indice + fotografias.length) % fotografias.length;
        fotografias.forEach((fotografia, posicao) => {
            fotografia.hidden = posicao !== indiceAtual;
        });
        indicadores.forEach((indicador, posicao) => {
            indicador.setAttribute('aria-pressed', String(posicao === indiceAtual));
        });
        const local = fotografias[indiceAtual].querySelector('h2').textContent;
        contador.textContent = `${indiceAtual + 1} / ${fotografias.length} · ${local}`;
    }
    fotografias.forEach((fotografia) => {
        const imagem = fotografia.querySelector('img');

        // Mantém a galeria utilizável se uma fotografia falhar.
        function mostrarErroImagem() {
            imagem.hidden = true;
            if (fotografia.querySelector('.gallery-image-error')) return;
            const aviso = document.createElement('p');
            aviso.className = 'gallery-image-error';
            aviso.textContent =
                'Não foi possível carregar esta fotografia. Podes continuar a explorar a galeria.';
            fotografia.prepend(aviso);
        }
        imagem.addEventListener('error', mostrarErroImagem);
        // Trata também uma falha que ocorreu antes de registar o evento.
        if (imagem.complete && imagem.naturalWidth === 0) mostrarErroImagem();
    });

    // Botões e indicadores.
    anterior.addEventListener('click', () => mostrarFotografia(indiceAtual - 1));
    seguinte.addEventListener('click', () => mostrarFotografia(indiceAtual + 1));
    indicadores.forEach((indicador) => {
        indicador.addEventListener('click', () =>
            mostrarFotografia(Number(indicador.dataset.foto)),
        );
    });

    // As setas atuam apenas quando o foco está no carrossel.
    galeria.addEventListener('keydown', (evento) => {
        if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') {
            evento.preventDefault();
            mostrarFotografia(indiceAtual + (evento.key === 'ArrowRight' ? 1 : -1));
        }
    });
    mostrarFotografia(0);
    document.querySelector('#controlos-galeria').hidden = false;
})();
