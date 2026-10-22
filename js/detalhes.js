(() => {
'use strict';
const { obterJSON, formatarValor, grausParaDirecao, estadoTempo, indiceHoraAtual,
    formatarData, mostrarCarregamento, mostrarErro, obterPrevisaoIPMA } = window.MarUtils;
const parametros = new URLSearchParams(location.search);
const latTexto = parametros.get('lat');
const lonTexto = parametros.get('lon');
const latitude = Number(latTexto);
const longitude = Number(lonTexto);
const local = parametros.get('local')?.trim() || 'Região costeira';
const tempo = document.querySelector('#tempo');
const mar = document.querySelector('#mar');
const atualizar = document.querySelector('#atualizar');
const variaveisMar = ['wave_height', 'wave_direction', 'wave_period', 'swell_wave_height',
    'swell_wave_direction', 'swell_wave_period', 'wind_wave_height', 'wind_wave_direction',
    'wind_wave_period', 'sea_surface_temperature'];
function criarURL(base, opcoes) {
    return `${base}?${new URLSearchParams({ latitude, longitude, timezone: 'auto', timeformat: 'unixtime', ...opcoes })}`;
}
function elemento(tag, classe, texto) {
    const item = document.createElement(tag);
    item.className = classe;
    item.textContent = texto;
    return item;
}
function metricas(pares) {
    const lista = elemento('dl', 'metrics', '');
    pares.forEach(([nome, valor]) => {
        const grupo = document.createElement('div');
        grupo.append(elemento('dt', '', nome), elemento('dd', '', valor));
        lista.append(grupo);
    });
    return lista;
}
async function carregarTempo() {
    mostrarCarregamento(tempo);
    try {
        const dados = await obterJSON(criarURL('https://api.open-meteo.com/v1/forecast', {
            current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
            wind_speed_unit: 'kmh'
        }));
        if (!dados.current) throw new Error('Resposta meteorológica sem dados atuais.');
        const atual = dados.current;
        tempo.replaceChildren(
            elemento('div', 'primary-value', formatarValor(atual.temperature_2m, '°C')),
            elemento('p', 'primary-caption', estadoTempo(atual.weather_code)),
            metricas([
                ['Humidade', formatarValor(atual.relative_humidity_2m, '%')],
                ['Precipitação', formatarValor(atual.precipitation, 'mm')],
                ['Vento', formatarValor(atual.wind_speed_10m, 'km/h')],
                ['Direção do vento', grausParaDirecao(atual.wind_direction_10m)],
                ['Rajadas', formatarValor(atual.wind_gusts_10m, 'km/h')]
            ]),
            elemento('p', 'update-note', `Hora dos dados: ${formatarData(atual.time, dados.timezone)} · ${dados.timezone || 'Fuso N/D'} · Open-Meteo`)
        );
    } catch (erro) {
        console.error('Tempo:', erro);
        mostrarErro(tempo, carregarTempo);
    }
}
async function carregarMar() {
    mostrarCarregamento(mar);
    try {
        // Dados horários permitem consultar variáveis sem suporte em current.
        const opcoes = { hourly: variaveisMar.join(','), cell_selection: 'sea', forecast_days: 2, past_days: 1 };
        let dados;
        try {
            dados = await obterJSON(criarURL('https://marine-api.open-meteo.com/v1/marine', opcoes));
        } catch (erro) {
            if (erro.status !== 400) throw erro;
            opcoes.hourly = variaveisMar.filter(nome => nome !== 'sea_surface_temperature').join(',');
            dados = await obterJSON(criarURL('https://marine-api.open-meteo.com/v1/marine', opcoes));
        }
        if (!Array.isArray(dados.hourly?.time)) throw new Error('Resposta marítima sem dados horários.');
        const indice = indiceHoraAtual(dados.hourly.time);
        const valor = nome => indice < 0 ? null : dados.hourly[nome]?.[indice];
        mar.replaceChildren(
            elemento('div', 'primary-value', formatarValor(valor('wave_height'), 'm')),
            elemento('p', 'primary-caption', 'Altura significativa das ondas'),
            metricas([
                ['Direção das ondas', grausParaDirecao(valor('wave_direction'))],
                ['Período das ondas', formatarValor(valor('wave_period'), 's')],
                ['Temperatura da água', formatarValor(valor('sea_surface_temperature'), '°C')]
            ]),
            elemento('h3', 'metric-group', 'SWELL · ONDULAÇÃO'),
            metricas([
                ['Altura', formatarValor(valor('swell_wave_height'), 'm')],
                ['Direção', grausParaDirecao(valor('swell_wave_direction'))],
                ['Período', formatarValor(valor('swell_wave_period'), 's')]
            ]),
            elemento('h3', 'metric-group', 'ONDAS DE VENTO'),
            metricas([
                ['Altura', formatarValor(valor('wind_wave_height'), 'm')],
                ['Direção', grausParaDirecao(valor('wind_wave_direction'))],
                ['Período', formatarValor(valor('wind_wave_period'), 's')]
            ]),
            elemento('p', 'update-note', `Hora dos dados: ${formatarData(indice < 0 ? null : dados.hourly.time[indice], dados.timezone)} · ${dados.timezone || 'Fuso N/D'} · Open-Meteo Marine`)
        );
    } catch (erro) {
        console.error('Mar:', erro);
        mostrarErro(mar, carregarMar);
    }
}
async function carregarTudo() {
    atualizar.disabled = true;
    await Promise.allSettled([carregarTempo(), carregarMar()]);
    atualizar.disabled = false;
}
// O IPMA devolve várias medidas como texto; valores vazios continuam a ser N/D.
function valorIPMA(valor) {
    if (typeof valor === 'string') {
        if (!valor.trim()) return null;
        return Number(valor);
    }
    return typeof valor === 'number' ? valor : null;
}
function intervaloIPMA(minimo, maximo, unidade) {
    return `${formatarValor(valorIPMA(minimo), unidade)} – ${formatarValor(valorIPMA(maximo), unidade)}`;
}
function apresentarIPMA(painel, dados, registos) {
    painel.replaceChildren();
    if (!registos.length) {
        painel.append(elemento('p', 'data-note', 'N/D — Não existe previsão IPMA correspondente a este local.'));
        return;
    }
    const data = typeof dados.forecastDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dados.forecastDate)
        ? dados.forecastDate.split('-').reverse().join('/') : 'N/D';
    painel.append(elemento('p', 'ipma-date', `Previsão para ${data} · Fonte: IPMA`));
    registos.forEach(registo => {
        const cartao = elemento('div', 'card ipma-card', '');
        cartao.append(metricas([
            ['Altura das ondas (mín. – máx.)', intervaloIPMA(registo.waveHighMin, registo.waveHighMax, 'm')],
            ['Período das ondas (mín. – máx.)', intervaloIPMA(registo.wavePeriodMin, registo.wavePeriodMax, 's')],
            ['Mar total (mín. – máx.)', intervaloIPMA(registo.totalSeaMin, registo.totalSeaMax, 'm')],
            ['Direção predominante das ondas', typeof registo.predWaveDir === 'string' && registo.predWaveDir.trim() ? registo.predWaveDir : 'N/D'],
            ['Temperatura da água (mín. – máx.)', intervaloIPMA(registo.sstMin, registo.sstMax, '°C')]
        ]));
        painel.append(cartao);
    });
}
async function consultarIPMA() {
    const painel = document.querySelector('#dados-ipma');
    const botao = document.querySelector('#consultar-ipma');
    const dia = document.querySelector('#dia-ipma');
    mostrarCarregamento(painel);
    botao.disabled = true;
    dia.disabled = true;
    try {
        const dados = await obterPrevisaoIPMA(dia.value);
        if (!Array.isArray(dados.data)) throw new Error('Formato inesperado do IPMA.');
        const registos = dados.data.filter(registo =>
            (parametros.get('id') && String(registo.globalIdLocal) === parametros.get('id')) ||
            (parametros.get('idLocal') && String(registo.idLocal) === parametros.get('idLocal')));
        apresentarIPMA(painel, dados, registos);
    } catch (erro) {
        console.error('IPMA:', erro);
        mostrarErro(painel, consultarIPMA);
    } finally {
        botao.disabled = false;
        dia.disabled = false;
    }
}
if (!latTexto?.trim() || !lonTexto?.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    const aviso = document.querySelector('#erro-local');
    aviso.hidden = false;
    aviso.textContent = 'Local inválido. Volta ao catálogo e escolhe uma região.';
    atualizar.disabled = true;
    tempo.textContent = 'N/D';
    mar.textContent = 'N/D';
} else {
    document.querySelector('#nome-local').textContent = local.replace(/,\s*Costa\s*$/i, '');
    document.title = `${local} · Estado do Mar`;
    document.querySelector('#coordenadas').textContent = `${latitude}° lat · ${longitude}° lon · Portugal`;
    document.querySelector('#oficial').hidden = !(parametros.get('id') || parametros.get('idLocal'));
    atualizar.addEventListener('click', carregarTudo);
    document.querySelector('#consultar-ipma').addEventListener('click', consultarIPMA);
    document.querySelector('#dia-ipma').addEventListener('change', consultarIPMA);
    carregarTudo();
}

})();
