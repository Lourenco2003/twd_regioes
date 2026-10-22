(() => {
'use strict';
const API_IPMA = 'https://api.ipma.pt/open-data/';
async function obterJSON(url) {
    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), 20000);
    try {
        const resposta = await fetch(url, { signal: controlador.signal });
        if (!resposta.ok) {
            const erro = new Error(`Erro ao obter dados (HTTP ${resposta.status}).`);
            erro.status = resposta.status;
            throw erro;
        }
        return await resposta.json();
    } finally {
        clearTimeout(limite);
    }
}
function numeroDisponivel(valor) {
    return typeof valor === 'number' && Number.isFinite(valor);
}
function formatarValor(valor, unidade = '') {
    if (!numeroDisponivel(valor)) return 'N/D';
    return `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(valor)}${unidade ? ` ${unidade}` : ''}`;
}
function grausParaDirecao(graus) {
    if (!numeroDisponivel(graus)) return 'N/D';
    const direcoes = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return direcoes[Math.round(((graus % 360) + 360) % 360 / 45) % 8];
}
function estadoTempo(codigo) {
    const estados = {
        0: 'Céu limpo', 1: 'Predominantemente limpo', 2: 'Parcialmente nublado',
        3: 'Céu encoberto', 45: 'Nevoeiro', 48: 'Nevoeiro com geada',
        51: 'Chuvisco fraco', 53: 'Chuvisco moderado', 55: 'Chuvisco intenso',
        56: 'Chuvisco gelado fraco', 57: 'Chuvisco gelado intenso',
        61: 'Chuva fraca', 63: 'Chuva moderada', 65: 'Chuva forte',
        66: 'Chuva gelada fraca', 67: 'Chuva gelada forte',
        71: 'Neve fraca', 73: 'Neve moderada', 75: 'Neve forte', 77: 'Grãos de neve',
        80: 'Aguaceiros fracos', 81: 'Aguaceiros moderados', 82: 'Aguaceiros fortes',
        85: 'Aguaceiros de neve fracos', 86: 'Aguaceiros de neve fortes',
        95: 'Trovoada', 96: 'Trovoada com granizo', 99: 'Trovoada com granizo forte'
    };
    return numeroDisponivel(codigo) ? (estados[codigo] || 'N/D') : 'N/D';
}
// Timestamps Unix evitam diferenças entre os fusos do navegador e da região.
function indiceHoraAtual(tempos, agora = Date.now() / 1000) {
    if (!Array.isArray(tempos)) return -1;
    let indice = -1;
    tempos.forEach((tempo, i) => {
        if (numeroDisponivel(tempo) && tempo <= agora && agora - tempo < 7200 &&
            (indice === -1 || tempo > tempos[indice])) indice = i;
    });
    return indice;
}
function formatarData(tempo, fuso = 'Europe/Lisbon') {
    if (!numeroDisponivel(tempo)) return 'N/D';
    try {
        return new Intl.DateTimeFormat('pt-PT', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: fuso
        }).format(new Date(tempo * 1000));
    } catch { return 'N/D'; }
}
function mostrarCarregamento(elemento) {
    elemento.replaceChildren();
    const texto = document.createElement('p');
    texto.className = 'loading-panel';
    texto.textContent = 'A carregar dados...';
    elemento.append(texto);
}
function mostrarErro(elemento, repetir) {
    elemento.replaceChildren();
    const aviso = document.createElement('div');
    aviso.className = 'error-panel';
    aviso.textContent = 'Não foi possível obter os dados neste momento.';
    if (repetir) {
        const botao = document.createElement('button');
        botao.className = 'btn btn-outline-ocean retry';
        botao.type = 'button';
        botao.textContent = 'Tentar novamente';
        botao.addEventListener('click', repetir);
        aviso.append(document.createElement('br'), botao);
    }
    elemento.append(aviso);
}
async function obterPrevisaoIPMA(dia = 0) {
    if (![0, 1, 2].includes(Number(dia))) throw new Error('Dia inválido.');
    return obterJSON(`${API_IPMA}forecast/oceanography/daily/hp-daily-sea-forecast-day${Number(dia)}.json`);
}

window.MarUtils = Object.freeze({ API_IPMA, obterJSON, numeroDisponivel, formatarValor, grausParaDirecao, estadoTempo, indiceHoraAtual, formatarData, mostrarCarregamento, mostrarErro, obterPrevisaoIPMA });
})();
