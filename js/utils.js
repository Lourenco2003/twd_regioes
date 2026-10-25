// Funções usadas por várias páginas.

const API_IPMA = 'https://api.ipma.pt/open-data/';

// Faz um pedido e lê a resposta JSON. Cancela-o se demorar mais de 20 segundos.
async function obterJSON(url) {
    // Permite cancelar o pedido ao atingir o tempo limite.
    const controlador = new AbortController();
    const limite = setTimeout(function () {
        controlador.abort();
    }, 20000);

    try {
        const resposta = await fetch(url, { signal: controlador.signal });

        if (!resposta.ok) {
            const erro = new Error('Erro ao obter dados (HTTP ' + resposta.status + ').');
            // Este estado permite repetir o pedido marítimo sem a temperatura da água.
            erro.status = resposta.status;
            throw erro;
        }

        const dados = await resposta.json();
        return dados;
    } finally {
        // Remove o temporizador quando o pedido termina, mesmo que falhe.
        clearTimeout(limite);
    }
}

// Um valor ausente não deve ser confundido com o número zero.
function numeroDisponivel(valor) {
    if (typeof valor !== 'number') {
        return false;
    }
    return Number.isFinite(valor);
}

// Formata um valor com a sua unidade, ou mostra N/D.
function formatarValor(valor, unidade) {
    if (!numeroDisponivel(valor)) {
        return 'N/D';
    }

    const numero = valor.toLocaleString('pt-PT', { maximumFractionDigits: 1 });
    if (unidade) {
        return numero + ' ' + unidade;
    }
    return numero;
}

// Converte uma direção em graus num ponto cardeal.
function grausParaDirecao(graus) {
    if (!numeroDisponivel(graus)) {
        return 'N/D';
    }

    const direcoes = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    let angulo = graus % 360;
    if (angulo < 0) {
        angulo = angulo + 360;
    }

    let posicao = Math.round(angulo / 45);
    if (posicao === 8) {
        posicao = 0;
    }
    return direcoes[posicao];
}

// A API identifica o estado do tempo através destes códigos WMO.
function estadoTempo(codigo) {
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
        99: 'Trovoada com granizo forte'
    };

    if (!numeroDisponivel(codigo) || estados[codigo] === undefined) {
        return 'N/D';
    }
    return estados[codigo];
}

// Procura a hora mais recente, não futura e com menos de duas horas.
function indiceHoraAtual(tempos, agora) {
    if (!Array.isArray(tempos)) {
        return -1;
    }
    if (agora === undefined) {
        agora = Date.now() / 1000;
    }

    let indice = -1;
    for (let i = 0; i < tempos.length; i++) {
        const hora = tempos[i];
        if (numeroDisponivel(hora) && hora <= agora && agora - hora < 7200) {
            if (indice === -1) {
                indice = i;
            } else if (hora > tempos[indice]) {
                indice = i;
            }
        }
    }
    return indice;
}

// Apresenta a data e a hora no fuso da região.
function formatarData(tempo, fuso) {
    if (!numeroDisponivel(tempo)) {
        return 'N/D';
    }
    if (fuso === undefined) {
        fuso = 'Europe/Lisbon';
    }

    try {
        const data = new Date(tempo * 1000);
        const formato = new Intl.DateTimeFormat('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: fuso
        });
        return formato.format(data);
    } catch (erro) {
        return 'N/D';
    }
}

// Limpa a área e informa que os dados estão a carregar.
function mostrarCarregamento(elemento) {
    elemento.textContent = '';
    const texto = document.createElement('p');
    texto.className = 'loading-panel';
    texto.textContent = 'A carregar dados...';
    elemento.appendChild(texto);
}

// O botão volta a executar a função recebida no parâmetro repetir.
function mostrarErro(elemento, repetir) {
    elemento.textContent = '';
    const aviso = document.createElement('div');
    aviso.className = 'error-panel';
    aviso.textContent = 'Não foi possível obter os dados neste momento.';

    if (typeof repetir === 'function') {
        const botao = document.createElement('button');
        botao.className = 'btn btn-outline-ocean retry';
        botao.type = 'button';
        botao.textContent = 'Tentar novamente';
        botao.addEventListener('click', repetir);
        aviso.appendChild(document.createElement('br'));
        aviso.appendChild(botao);
    }
    elemento.appendChild(aviso);
}

// O IPMA disponibiliza três ficheiros: dia 0, dia 1 e dia 2.
async function obterPrevisaoIPMA(dia) {
    if (dia === undefined) {
        dia = 0;
    }
    dia = Number(dia);
    if (dia !== 0 && dia !== 1 && dia !== 2) {
        throw new Error('Dia inválido.');
    }

    const url = API_IPMA + 'forecast/oceanography/daily/hp-daily-sea-forecast-day' + dia + '.json';
    const dados = await obterJSON(url);
    return dados;
}
