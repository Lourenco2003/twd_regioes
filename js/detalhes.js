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
async function consultarIPMA() {
    const painel = document.querySelector('#dados-ipma');
    const botao = document.querySelector('#consultar-ipma');
    mostrarCarregamento(painel);
    botao.disabled = true;
    try {
        const dados = await obterPrevisaoIPMA(document.querySelector('#dia-ipma').value);
        if (!Array.isArray(dados.data)) throw new Error('Formato inesperado do IPMA.');
        const registos = dados.data.filter(registo =>
            (parametros.get('id') && String(registo.globalIdLocal) === parametros.get('id')) ||
            (parametros.get('idLocal') && String(registo.idLocal) === parametros.get('idLocal')));
        painel.replaceChildren(elemento('pre', '', registos.length
            ? JSON.stringify({ dataPrevisao: dados.forecastDate ?? dados.dataUpdate ?? null, data: registos }, null, 2)
            : 'N/D — Não existe previsão IPMA correspondente a este local.'));
    } catch (erro) {
        console.error('IPMA:', erro);
        mostrarErro(painel, consultarIPMA);
    } finally { botao.disabled = false; }
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
    carregarTudo();
}

})();
