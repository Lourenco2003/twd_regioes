/**
 * galeria.js — controla o carrossel de fotografias locais, sem bibliotecas adicionais.
 * Fluxo: obter os elementos, associar os cliques e mostrar a primeira fotografia.
 */
(() => {
    // O modo estrito ajuda a detetar erros de escrita e variáveis não declaradas.
    'use strict';

    // Guarda a região do carrossel para receber as setas do teclado quando tem foco.
    const galeria = document.querySelector('#galeria');
    // Transforma as figuras e os botões das miniaturas em listas JavaScript.
    const fotografias = [...document.querySelectorAll('.gallery-slide')];
    const miniaturas = [...document.querySelectorAll('[data-foto]')];
    // Obtém os controlos e a área que anuncia a fotografia selecionada.
    const anterior = document.querySelector('#foto-anterior');
    const seguinte = document.querySelector('#foto-seguinte');
    const contador = document.querySelector('#contador-fotos');
    // O índice zero corresponde à primeira fotografia: Espinho.
    let indiceAtual = 0;

    // Atualiza a fotografia visível, a seleção das miniaturas e o contador.
    function mostrarFotografia(indice) {
        // O módulo permite voltar à primeira fotografia depois da última e vice-versa.
        indiceAtual = (indice + fotografias.length) % fotografias.length;
        // Só a fotografia selecionada fica visível e acessível a leitores de ecrã.
        fotografias.forEach((fotografia, posicao) => {
            fotografia.hidden = posicao !== indiceAtual;
        });
        // Identifica visualmente a miniatura selecionada e atualiza a acessibilidade.
        miniaturas.forEach((miniatura, posicao) => {
            miniatura.setAttribute('aria-pressed', String(posicao === indiceAtual));
        });
        // Lê o nome já presente na legenda, evitando manter outra lista de nomes no JavaScript.
        const local = fotografias[indiceAtual].querySelector('h2').textContent;
        // Apresenta a posição atual, o total de imagens e o nome do local.
        contador.textContent = `${indiceAtual + 1} / ${fotografias.length} · ${local}`;
    }

    // Mostra uma mensagem no lugar da imagem caso um ficheiro não possa ser carregado.
    fotografias.forEach((fotografia) => {
        const imagem = fotografia.querySelector('img');
        function mostrarErroImagem() {
            // Oculta o ícone de imagem partida, mantendo a legenda e os controlos disponíveis.
            imagem.hidden = true;
            if (fotografia.querySelector('.gallery-image-error')) return;
            // Cria a mensagem com texto simples, sem interpretar HTML.
            const aviso = document.createElement('p');
            aviso.className = 'gallery-image-error';
            aviso.textContent =
                'Não foi possível carregar esta fotografia. Podes continuar a explorar a galeria.';
            fotografia.prepend(aviso);
        }
        // O evento trata falhas futuras; complete e naturalWidth detetam uma falha já concluída.
        imagem.addEventListener('error', mostrarErroImagem);
        if (imagem.complete && imagem.naturalWidth === 0) mostrarErroImagem();
    });

    // Cada clique avança ou recua uma posição, sem abrir outra página.
    anterior.addEventListener('click', () => mostrarFotografia(indiceAtual - 1));
    seguinte.addEventListener('click', () => mostrarFotografia(indiceAtual + 1));
    // Cada miniatura envia o seu índice, guardado no atributo data-foto do HTML.
    miniaturas.forEach((miniatura) => {
        miniatura.addEventListener('click', () =>
            mostrarFotografia(Number(miniatura.dataset.foto)),
        );
    });
    // As setas só controlam a galeria quando o foco está no carrossel ou nos seus controlos.
    galeria.addEventListener('keydown', (evento) => {
        if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') {
            // Evita deslocar horizontalmente a página ao navegar pelas fotografias.
            evento.preventDefault();
            mostrarFotografia(indiceAtual + (evento.key === 'ArrowRight' ? 1 : -1));
        }
    });

    // Inicializa o contador antes de revelar os controlos dependentes de JavaScript.
    mostrarFotografia(0);
    document.querySelector('#controlos-galeria').hidden = false;
    document.querySelector('#selecao-fotos').hidden = false;
})();
