// Condições da atmosfera e do mar para a região escolhida.
'use strict';

const parametrosDetalhes = new URLSearchParams(location.search);
const latTexto = parametrosDetalhes.get('lat');
const lonTexto = parametrosDetalhes.get('lon');
const latitude = Number(latTexto);
const longitude = Number(lonTexto);
let nomeLocal = parametrosDetalhes.get('local');

if (nomeLocal === null || nomeLocal.trim() === '') {
    nomeLocal = 'Região costeira';
} else {
    nomeLocal = nomeLocal.trim();
}

const painelTempo = document.getElementById('tempo');
const painelMar = document.getElementById('mar');
const botaoAtualizar = document.getElementById('atualizar');
const botaoIPMA = document.getElementById('consultar-ipma');
const filtrosIPMA = document.querySelectorAll('[data-dia]');
let diaIPMA = 0;
let pedidosEmCurso = 0;

// O botão geral fica desativado enquanto existir uma consulta por terminar.
function iniciarPedido() {
    pedidosEmCurso = pedidosEmCurso + 1;
    botaoAtualizar.disabled = true;
}

function terminarPedido() {
    pedidosEmCurso = pedidosEmCurso - 1;
    if (pedidosEmCurso === 0) {
        botaoAtualizar.disabled = false;
    }
}

function tratarErroImagemRegiao() {
    document.getElementById('imagem-regiao').hidden = true;
    document.getElementById('erro-imagem-regiao').hidden = false;
}

function apresentarRegiao() {
    const regiao = obterRegiao(nomeLocal);
    const imagem = document.getElementById('imagem-regiao');
    if (regiao === null) {
        document.getElementById('descricao-regiao').textContent =
            'Ainda não existe uma apresentação para esta região. Consulta abaixo as condições do tempo e do mar.';
        return;
    }

    document.getElementById('zona-regiao').textContent = regiao.zona;
    document.getElementById('descricao-regiao').textContent = regiao.descricao;
    imagem.alt = 'Fotografia associada à região de ' + regiao.nome;
    imagem.addEventListener('error', tratarErroImagemRegiao);
    imagem.src = 'images/' + regiao.imagem;
}

// As duas APIs usam as coordenadas e o fuso horário da região.
function criarURL(base) {
    const parametros = new URLSearchParams();
    parametros.set('latitude', latitude);
    parametros.set('longitude', longitude);
    parametros.set('timezone', 'auto');
    parametros.set('timeformat', 'unixtime');
    return base + '?' + parametros.toString();
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    elemento.className = classe;
    elemento.textContent = texto;
    return elemento;
}

// Cada par da lista contém o nome e o valor de uma medida.
function criarMetricas(pares) {
    const lista = criarElemento('dl', 'metrics', '');
    for (let i = 0; i < pares.length; i++) {
        const grupo = document.createElement('div');
        const nome = criarElemento('dt', '', pares[i][0]);
        const valor = criarElemento('dd', '', pares[i][1]);
        grupo.appendChild(nome);
        grupo.appendChild(valor);
        lista.appendChild(grupo);
    }
    return lista;
}

function criarNotaAtualizacao(hora, fuso, fonte) {
    let nomeFuso = fuso;
    if (!nomeFuso) {
        nomeFuso = 'Fuso N/D';
    }
    const texto = 'Hora dos dados: ' + formatarData(hora, fuso) + ' · ' + nomeFuso + ' · ' + fonte;
    return criarElemento('p', 'update-note', texto);
}

async function carregarTempo() {
    iniciarPedido();
    mostrarCarregamento(painelTempo);

    try {
        let url = criarURL('https://api.open-meteo.com/v1/forecast');
        url =
            url +
            '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m';
        url = url + '&wind_speed_unit=kmh';
        const dados = await obterJSON(url);
        if (!dados.current) {
            throw new Error('Resposta meteorológica sem dados atuais.');
        }
        const atual = dados.current;

        const resumo = criarElemento('div', 'weather-highlight', '');
        resumo.appendChild(criarElemento('span', 'metric-label', 'Temperatura'));
        resumo.appendChild(
            criarElemento('div', 'primary-value', formatarValor(atual.temperature_2m, '°C'))
        );
        resumo.appendChild(criarElemento('p', 'primary-caption', estadoTempo(atual.weather_code)));

        const medidas = [
            ['Humidade', formatarValor(atual.relative_humidity_2m, '%')],
            ['Precipitação', formatarValor(atual.precipitation, 'mm')],
            ['Vento', formatarValor(atual.wind_speed_10m, 'km/h')],
            ['Direção do vento', grausParaDirecao(atual.wind_direction_10m)],
            ['Rajadas', formatarValor(atual.wind_gusts_10m, 'km/h')]
        ];
        const linha = criarElemento('div', 'weather-row', '');
        linha.appendChild(resumo);
        linha.appendChild(criarMetricas(medidas));

        painelTempo.textContent = '';
        painelTempo.appendChild(linha);
        painelTempo.appendChild(criarNotaAtualizacao(atual.time, dados.timezone, 'Open-Meteo'));
    } catch (erro) {
        console.error('Tempo:', erro);
        mostrarErro(painelTempo, carregarTempo);
    } finally {
        terminarPedido();
    }
}

function criarURLMar(incluirTemperatura) {
    const variaveis = [
        'wave_height',
        'wave_direction',
        'wave_period',
        'swell_wave_height',
        'swell_wave_direction',
        'swell_wave_period',
        'wind_wave_height',
        'wind_wave_direction',
        'wind_wave_period'
    ];
    if (incluirTemperatura) {
        variaveis.push('sea_surface_temperature');
    }

    let url = criarURL('https://marine-api.open-meteo.com/v1/marine');
    url = url + '&hourly=' + variaveis.join(',');
    url = url + '&cell_selection=sea&forecast_days=2&past_days=1';
    return url;
}

// Alguns modelos não aceitam a temperatura do mar; nesse caso, tenta sem esse campo.
async function obterDadosMar() {
    try {
        const dados = await obterJSON(criarURLMar(true));
        return dados;
    } catch (erro) {
        if (erro.status === 400) {
            const dados = await obterJSON(criarURLMar(false));
            return dados;
        }
        throw erro;
    }
}

function obterValorMar(dados, campo, indice) {
    if (indice < 0) {
        return null;
    }
    if (dados.hourly[campo] === undefined || dados.hourly[campo] === null) {
        return null;
    }
    return dados.hourly[campo][indice];
}

function criarGrupoOndas(dados, indice, titulo, prefixo) {
    const altura = obterValorMar(dados, prefixo + '_height', indice);
    const periodo = obterValorMar(dados, prefixo + '_period', indice);
    const direcao = obterValorMar(dados, prefixo + '_direction', indice);
    const medidas = [
        ['Altura', formatarValor(altura, 'm')],
        ['Período', formatarValor(periodo, 's')],
        ['Direção', grausParaDirecao(direcao)]
    ];

    const grupo = criarElemento('div', 'marine-extra', '');
    grupo.appendChild(criarElemento('h3', 'metric-group', titulo));
    grupo.appendChild(criarMetricas(medidas));
    return grupo;
}

async function carregarMar() {
    iniciarPedido();
    mostrarCarregamento(painelMar);

    try {
        const dados = await obterDadosMar();
        if (!dados.hourly || !Array.isArray(dados.hourly.time)) {
            throw new Error('Resposta marítima sem dados horários.');
        }

        const indice = indiceHoraAtual(dados.hourly.time);
        const altura = obterValorMar(dados, 'wave_height', indice);
        const periodo = obterValorMar(dados, 'wave_period', indice);
        const direcao = obterValorMar(dados, 'wave_direction', indice);
        const temperatura = obterValorMar(dados, 'sea_surface_temperature', indice);
        const medidas = [
            ['Altura das ondas', formatarValor(altura, 'm')],
            ['Período das ondas', formatarValor(periodo, 's')],
            ['Direção das ondas', grausParaDirecao(direcao)],
            ['Temperatura da água', formatarValor(temperatura, '°C')]
        ];
        const principais = criarMetricas(medidas);
        principais.classList.add('comparison-metrics');
        principais.querySelector('dd').classList.add('primary-value');

        const complementos = criarElemento('div', 'marine-extras', '');
        complementos.appendChild(criarGrupoOndas(dados, indice, 'Swell · Ondulação', 'swell_wave'));
        complementos.appendChild(criarGrupoOndas(dados, indice, 'Ondas de vento', 'wind_wave'));

        let hora = null;
        if (indice >= 0) {
            hora = dados.hourly.time[indice];
        }
        painelMar.textContent = '';
        painelMar.appendChild(principais);
        painelMar.appendChild(complementos);
        painelMar.appendChild(criarNotaAtualizacao(hora, dados.timezone, 'Open-Meteo Marine'));
    } catch (erro) {
        console.error('Mar:', erro);
        mostrarErro(painelMar, carregarMar);
    } finally {
        terminarPedido();
    }
}

// O IPMA envia algumas medidas como texto. Um texto vazio continua a ser N/D.
function valorIPMA(valor) {
    if (typeof valor === 'string') {
        if (valor.trim() === '') {
            return null;
        }
        return Number(valor);
    }
    if (typeof valor === 'number') {
        return valor;
    }
    return null;
}

function intervaloIPMA(minimo, maximo, unidade) {
    const primeiro = formatarValor(valorIPMA(minimo), unidade);
    const segundo = formatarValor(valorIPMA(maximo), unidade);
    return primeiro + ' – ' + segundo;
}

// Verifica o formato AAAA-MM-DD e apresenta a data como DD/MM/AAAA.
function formatarDataIPMA(data) {
    if (typeof data !== 'string' || data.length !== 10) {
        return 'N/D';
    }
    if (data.charAt(4) !== '-' || data.charAt(7) !== '-') {
        return 'N/D';
    }
    for (let i = 0; i < data.length; i++) {
        if (i !== 4 && i !== 7) {
            const caractere = data.charAt(i);
            if (caractere < '0' || caractere > '9') {
                return 'N/D';
            }
        }
    }
    return data.substring(8, 10) + '/' + data.substring(5, 7) + '/' + data.substring(0, 4);
}

function criarCartaoIPMA(registo) {
    let direcao = 'N/D';
    if (typeof registo.predWaveDir === 'string' && registo.predWaveDir.trim() !== '') {
        direcao = registo.predWaveDir;
    }
    const medidas = [
        [
            'Altura das ondas (mín. – máx.)',
            intervaloIPMA(registo.waveHighMin, registo.waveHighMax, 'm')
        ],
        [
            'Período das ondas (mín. – máx.)',
            intervaloIPMA(registo.wavePeriodMin, registo.wavePeriodMax, 's')
        ],
        ['Direção predominante das ondas', direcao],
        ['Temperatura da água (mín. – máx.)', intervaloIPMA(registo.sstMin, registo.sstMax, '°C')]
    ];
    const principais = criarMetricas(medidas);
    principais.classList.add('comparison-metrics');

    const cartao = criarElemento('div', 'ipma-forecast', '');
    cartao.appendChild(principais);
    const marTotal = intervaloIPMA(registo.totalSeaMin, registo.totalSeaMax, 'm');
    cartao.appendChild(criarElemento('p', 'ipma-total', 'Mar total (mín. – máx.): ' + marTotal));
    return cartao;
}

function apresentarIPMA(painel, dados, registos) {
    painel.textContent = '';
    if (registos.length === 0) {
        painel.appendChild(
            criarElemento(
                'p',
                'data-note',
                'N/D — Não existe previsão IPMA correspondente a este local.'
            )
        );
        return;
    }

    const data = formatarDataIPMA(dados.forecastDate);
    painel.appendChild(criarElemento('p', 'ipma-date', 'Previsão para ' + data + ' · Fonte: IPMA'));
    for (let i = 0; i < registos.length; i++) {
        painel.appendChild(criarCartaoIPMA(registos[i]));
    }
}

function atualizarFiltrosIPMA(desativar) {
    for (let i = 0; i < filtrosIPMA.length; i++) {
        const filtro = filtrosIPMA[i];
        filtro.disabled = desativar;
        const numeroDia = Number(filtro.getAttribute('data-dia'));
        if (numeroDia === diaIPMA) {
            filtro.setAttribute('aria-pressed', 'true');
        } else {
            filtro.setAttribute('aria-pressed', 'false');
        }
    }
}

async function consultarIPMA() {
    const painel = document.getElementById('dados-ipma');
    const idGlobal = parametrosDetalhes.get('id');
    const idLocal = parametrosDetalhes.get('idLocal');
    if (!idGlobal && !idLocal) {
        painel.textContent =
            'N/D — Escolhe uma região no catálogo para consultar a previsão oficial.';
        return;
    }
    if (botaoIPMA.disabled) {
        return;
    }

    iniciarPedido();
    mostrarCarregamento(painel);
    botaoIPMA.disabled = true;
    atualizarFiltrosIPMA(true);

    try {
        const dados = await obterPrevisaoIPMA(diaIPMA);
        if (!Array.isArray(dados.data)) {
            throw new Error('Formato inesperado do IPMA.');
        }

        // A resposta tem vários locais. Guarda apenas os registos da região aberta.
        const registos = [];
        for (let i = 0; i < dados.data.length; i++) {
            const registo = dados.data[i];
            if (idGlobal && String(registo.globalIdLocal) === idGlobal) {
                registos.push(registo);
            } else if (idLocal && String(registo.idLocal) === idLocal) {
                registos.push(registo);
            }
        }
        apresentarIPMA(painel, dados, registos);
    } catch (erro) {
        console.error('IPMA:', erro);
        mostrarErro(painel, consultarIPMA);
    } finally {
        botaoIPMA.disabled = false;
        atualizarFiltrosIPMA(false);
        terminarPedido();
    }
}

function escolherDiaIPMA(evento) {
    diaIPMA = Number(evento.currentTarget.getAttribute('data-dia'));
    consultarIPMA();
}

// As consultas começam separadamente para que uma falha não bloqueie as outras.
function carregarTudo() {
    carregarTempo();
    carregarMar();
    consultarIPMA();
}

function coordenadasValidas() {
    if (latTexto === null || lonTexto === null) {
        return false;
    }
    if (latTexto.trim() === '' || lonTexto.trim() === '') {
        return false;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return false;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return false;
    }
    return true;
}

// Valida a URL e prepara os botões antes de carregar os dados.
if (!coordenadasValidas()) {
    const aviso = document.getElementById('erro-local');
    aviso.hidden = false;
    aviso.textContent = 'Local inválido. Volta ao catálogo e escolhe uma região.';
    botaoAtualizar.disabled = true;
    botaoIPMA.disabled = true;
    painelTempo.textContent = 'N/D';
    painelMar.textContent = 'N/D';
    document.getElementById('dados-ipma').textContent = 'N/D';
    atualizarFiltrosIPMA(true);
} else {
    document.getElementById('nome-local').textContent = limparNomeRegiao(nomeLocal);
    document.title = nomeLocal + ' · Estado do Mar';
    document.getElementById('coordenadas').textContent =
        latitude + '° lat · ' + longitude + '° lon · Portugal';
    apresentarRegiao();

    botaoAtualizar.addEventListener('click', carregarTudo);
    botaoIPMA.addEventListener('click', consultarIPMA);
    for (let i = 0; i < filtrosIPMA.length; i++) {
        filtrosIPMA[i].addEventListener('click', escolherDiaIPMA);
    }
    carregarTudo();
}
