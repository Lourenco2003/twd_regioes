/**
 * utils.js — código explicado para estudo.
 * Funções partilhadas: pedidos HTTP, formatação e mensagens da interface.
 * É carregado antes de catalogo.js ou detalhes.js e expõe o objeto window.MarUtils.
 * A indentação mostra os blocos; uma chaveta de fecho termina o bloco correspondente.
 */
// Executa imediatamente esta função; as suas variáveis ficam isoladas dos outros ficheiros.
(() => {
    // Ativa o modo estrito, que ajuda a detetar erros como variáveis usadas sem declaração.
    'use strict';
    // Guarda o endereço base dos dados abertos do IPMA para reutilizar nos pedidos.
    const API_IPMA = 'https://api.ipma.pt/open-data/';

    // Faz um pedido HTTP assíncrono, valida a resposta e converte o JSON num objeto JavaScript.
    async function obterJSON(url) {
        // Cria o controlador que permite cancelar o pedido à API.
        const controlador = new AbortController();
        // Cancela o pedido se demorarem mais de 20 000 milissegundos (20 segundos).
        const limite = setTimeout(() => controlador.abort(), 20000);
        // Começa o bloco protegido: os erros lançados aqui serão tratados por catch ou seguidos da
        // limpeza em finally.
        try {
            // Envia o pedido com Fetch e espera pela resposta; signal permite o cancelamento.
            const resposta = await fetch(url, { signal: controlador.signal });
            // Verifica se o servidor respondeu com um estado HTTP fora do intervalo de sucesso
            // (200 a 299).
            if (!resposta.ok) {
                // Cria um erro com o código HTTP recebido, por exemplo 404 ou 503.
                const erro = new Error(`Erro ao obter dados (HTTP ${resposta.status}).`);
                // Guarda o código no erro para permitir decisões específicas, como a tentativa
                // alternativa do mar.
                erro.status = resposta.status;
                // Interrompe esta tentativa e entrega o erro ao catch responsável pelo tratamento.
                throw erro;
            }
            // Espera pela leitura do corpo e converte o JSON; await mantém o temporizador ativo
            // durante a leitura.
            return await resposta.json();
        } finally {
            // Executa a limpeza final tanto quando o pedido funciona como quando ocorre um
            // erro.
            // Remove o temporizador para não cancelar um pedido que já terminou.
            clearTimeout(limite);
        }
    }

    // Verifica se um valor é um número finito; null, texto e NaN não são dados numéricos válidos.
    function numeroDisponivel(valor) {
        // Só aceita valores do tipo number que não sejam NaN nem infinito; zero continua válido.
        return typeof valor === 'number' && Number.isFinite(valor);
    }

    // Formata um número em português e acrescenta a unidade; devolve N/D quando falta informação.
    function formatarValor(valor, unidade = '') {
        // Interrompe a formatação quando o valor está ausente ou não é um número válido.
        if (!numeroDisponivel(valor)) return 'N/D';
        // Usa vírgula decimal e até uma casa decimal; acrescenta espaço e unidade apenas se
        // existir unidade.
        return `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(valor)}${unidade ? ` ${unidade}` : ''}`;
    }

    // Converte uma direção em graus num dos oito pontos cardeais e intercardeais.
    function grausParaDirecao(graus) {
        // Evita converter valores ausentes numa direção fictícia.
        if (!numeroDisponivel(graus)) return 'N/D';
        // Organiza as oito direções por setores de 45 graus, começando no norte.
        const direcoes = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        // Normaliza graus negativos ou acima de 360, arredonda para o setor mais próximo e obtém a
        // direção.
        return direcoes[Math.round((((graus % 360) + 360) % 360) / 45) % 8];
    }

    // Traduz o código meteorológico WMO devolvido pela Open-Meteo para uma descrição em português.
    function estadoTempo(codigo) {
        // Associa cada código WMO à sua descrição; as linhas seguintes são as entradas desta
        // tabela.
        const estados = {
            0: 'Céu limpo',
            1: 'Predominantemente limpo',
            2: 'Parcialmente nublado',
            3: 'Céu encoberto',
            45: 'Nevoeiro',
            48: 'Nevoeiro com geada',
            51: 'Chuvisco fraco',
            53: 'Chuvisco moderado',
            55: 'Chuvisco intenso',
            56: 'Chuvisco gelado fraco',
            57: 'Chuvisco gelado intenso',
            61: 'Chuva fraca',
            63: 'Chuva moderada',
            65: 'Chuva forte',
            66: 'Chuva gelada fraca',
            67: 'Chuva gelada forte',
            71: 'Neve fraca',
            73: 'Neve moderada',
            75: 'Neve forte',
            77: 'Grãos de neve',
            80: 'Aguaceiros fracos',
            81: 'Aguaceiros moderados',
            82: 'Aguaceiros fortes',
            85: 'Aguaceiros de neve fracos',
            86: 'Aguaceiros de neve fortes',
            95: 'Trovoada',
            96: 'Trovoada com granizo',
            99: 'Trovoada com granizo forte',
        };
        // Devolve a descrição conhecida; códigos ausentes ou desconhecidos apresentam N/D.
        return numeroDisponivel(codigo) ? estados[codigo] || 'N/D' : 'N/D';
    }

    // Encontra a posição da hora válida mais recente, nunca futura nem com duas horas ou mais de
    // atraso.
    function indiceHoraAtual(tempos, agora = Date.now() / 1000) {
        // Se a API não fornecer uma lista de horas, devolve -1 para indicar que não existe posição
        // válida.
        if (!Array.isArray(tempos)) return -1;
        // Começa sem uma hora selecionada; o valor -1 significa que ainda não há correspondência.
        let indice = -1;
        // Percorre os timestamps; tempo é o valor e i é a posição desse valor na lista.
        tempos.forEach((tempo, i) => {
            // Aceita apenas timestamps válidos, não posteriores a agora e com menos de 7 200
            // segundos de atraso.
            if (
                numeroDisponivel(tempo) &&
                tempo <= agora &&
                agora - tempo < 7200 &&
                // Escolhe esta posição se ainda não havia nenhuma ou se esta hora é mais recente
                // que a anterior.
                (indice === -1 || tempo > tempos[indice])
            )
                indice = i;
        });
        // Devolve a posição escolhida, ou -1 se nenhuma hora cumprir as condições.
        return indice;
    }

    // Converte um timestamp Unix (segundos desde 1970) numa data e hora no fuso da região.
    function formatarData(tempo, fuso = 'Europe/Lisbon') {
        // Não tenta criar uma data quando o timestamp está ausente ou é inválido.
        if (!numeroDisponivel(tempo)) return 'N/D';
        // Começa o bloco protegido: os erros lançados aqui serão tratados por catch ou seguidos da
        // limpeza em finally.
        try {
            // Configura a apresentação da data e hora com as convenções portuguesas.
            return new Intl.DateTimeFormat('pt-PT', {
                // Mostra dia, mês, hora e minuto com dois algarismos, respeitando o fuso horário
                // recebido.
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: fuso,
                // Converte segundos em milissegundos, cria a data e aplica o formato definido.
            }).format(new Date(tempo * 1000));
        } catch {
            // Se a data ou o fuso não puderem ser formatados, apresenta N/D em vez de parar a
            // página.
            return 'N/D';
        }
    }

    // Limpa o conteúdo anterior de uma área e apresenta a mensagem de carregamento.
    function mostrarCarregamento(elemento) {
        // Remove o conteúdo anterior de elemento para preparar a nova apresentação.
        elemento.replaceChildren();
        // Cria o elemento 'p' e guarda-o em texto; ainda não é visível até ser inserido no
        // documento.
        const texto = document.createElement('p');
        // Aplica as classes loading-panel a texto, associando a apresentação definida no CSS e/ou
        // no Bootstrap.
        texto.className = 'loading-panel';
        // Define o texto que o utilizador vê enquanto espera pelos dados.
        texto.textContent = 'A carregar dados...';
        // Insere texto dentro de elemento, pela ordem indicada.
        elemento.append(texto);
    }

    // Apresenta uma mensagem de erro e, quando recebe uma função, cria um botão para repetir.
    function mostrarErro(elemento, repetir) {
        // Remove o conteúdo anterior de elemento para preparar a nova apresentação.
        elemento.replaceChildren();
        // Cria o elemento 'div' e guarda-o em aviso; ainda não é visível até ser inserido no
        // documento.
        const aviso = document.createElement('div');
        // Aplica as classes error-panel a aviso, associando a apresentação definida no CSS e/ou no
        // Bootstrap.
        aviso.className = 'error-panel';
        // Define uma mensagem legível quando a consulta não pode ser concluída.
        aviso.textContent = 'Não foi possível obter os dados neste momento.';
        // Só cria a opção de repetir quando foi fornecida uma função para executar novamente.
        if (repetir) {
            // Cria o elemento 'button' e guarda-o em botao; ainda não é visível até ser inserido
            // no documento.
            const botao = document.createElement('button');
            // Aplica as classes btn btn-outline-ocean retry a botao, associando a apresentação
            // definida no CSS e/ou no Bootstrap.
            botao.className = 'btn btn-outline-ocean retry';
            // Impede que o botão seja interpretado como um botão de submissão de formulário.
            botao.type = 'button';
            // Define o texto do botão de recuperação do erro.
            botao.textContent = 'Tentar novamente';
            // Liga o clique à função recebida, sem a executar no momento em que o botão é criado.
            botao.addEventListener('click', repetir);
            // Adiciona uma quebra de linha e o botão dentro da mensagem de erro.
            aviso.append(document.createElement('br'), botao);
        }
        // Insere aviso dentro de elemento, pela ordem indicada.
        elemento.append(aviso);
    }

    // Consulta a previsão marítima oficial do IPMA: 0 = hoje, 1 = amanhã, 2 = depois de amanhã.
    async function obterPrevisaoIPMA(dia = 0) {
        // Aceita apenas os três dias suportados; qualquer outro valor provoca um erro.
        if (![0, 1, 2].includes(Number(dia))) throw new Error('Dia inválido.');
        // Insere o número do dia no endereço oficial e devolve a promessa com o JSON.
        return obterJSON(
            `${API_IPMA}forecast/oceanography/daily/hp-daily-sea-forecast-day${Number(dia)}.json`,
        );
    }

    // Disponibiliza as funções partilhadas em window.MarUtils; Object.freeze impede alterar
    // diretamente as propriedades deste objeto.
    window.MarUtils = Object.freeze({
        API_IPMA,
        obterJSON,
        numeroDisponivel,
        formatarValor,
        grausParaDirecao,
        estadoTempo,
        indiceHoraAtual,
        formatarData,
        mostrarCarregamento,
        mostrarErro,
        obterPrevisaoIPMA,
    });
})();
