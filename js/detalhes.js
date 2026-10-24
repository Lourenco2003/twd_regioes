// Condições da atmosfera e do mar para a região escolhida.
(() => {
    'use strict';
    const {
        obterJSON,
        formatarValor,
        grausParaDirecao,
        estadoTempo,
        indiceHoraAtual,
        formatarData,
        mostrarCarregamento,
        mostrarErro,
        obterPrevisaoIPMA,
    } = window.MarUtils;
    // Lê o local e as coordenadas enviados pelo catálogo.
    const parametros = new URLSearchParams(location.search);
    const latTexto = parametros.get('lat');
    const lonTexto = parametros.get('lon');
    const latitude = Number(latTexto);
    const longitude = Number(lonTexto);
    const local = parametros.get('local')?.trim() || 'Região costeira';
    const tempo = document.querySelector('#tempo');
    const mar = document.querySelector('#mar');
    const atualizar = document.querySelector('#atualizar');
    const filtrosIPMA = [...document.querySelectorAll('[data-dia]')];
    let diaIPMA = 0;
    const variaveisMar = [
        'wave_height',
        'wave_direction',
        'wave_period',
        'swell_wave_height',
        'swell_wave_direction',
        'swell_wave_period',
        'wind_wave_height',
        'wind_wave_direction',
        'wind_wave_period',
        'sea_surface_temperature',
    ];

    // Apresenta o texto e a fotografia antes das consultas meteorológicas.
    function apresentarRegiao() {
        const regiao = window.Regioes.obter(local);
        const imagem = document.querySelector('#imagem-regiao');
        if (!regiao) {
            document.querySelector('#descricao-regiao').textContent =
                'Ainda não existe uma apresentação para esta região. Consulta abaixo as condições do tempo e do mar.';
            return;
        }
        document.querySelector('#zona-regiao').textContent = regiao.zona;
        document.querySelector('#descricao-regiao').textContent = regiao.descricao;
        imagem.alt = `Fotografia associada à região de ${regiao.nome}`;
        // Conserva o espaço da fotografia mesmo que o ficheiro não carregue.
        imagem.addEventListener(
            'error',
            () => {
                imagem.hidden = true;
                document.querySelector('#erro-imagem-regiao').hidden = false;
            },
            { once: true },
        );
        imagem.src = `images/${regiao.imagem}`;
    }

    // Monta a URL com as coordenadas, o fuso local e as opções da consulta.
    function criarURL(base, opcoes) {
        return `${base}?${new URLSearchParams({ latitude, longitude, timezone: 'auto', timeformat: 'unixtime', ...opcoes })}`;
    }

    // Cria um elemento com classes e texto simples.
    function elemento(tag, classe, texto) {
        const item = document.createElement(tag);
        item.className = classe;
        item.textContent = texto;
        return item;
    }

    // Transforma pares [nome, valor] numa lista de medidas.
    function metricas(pares) {
        const lista = elemento('dl', 'metrics', '');
        pares.forEach(([nome, valor]) => {
            const grupo = document.createElement('div');
            grupo.append(elemento('dt', '', nome), elemento('dd', '', valor));
            lista.append(grupo);
        });
        return lista;
    }

    // Consulta e apresenta as condições atuais da atmosfera.
    async function carregarTempo() {
        mostrarCarregamento(tempo);
        try {
            const dados = await obterJSON(
                criarURL('https://api.open-meteo.com/v1/forecast', {
                    current:
                        'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
                    wind_speed_unit: 'kmh',
                }),
            );
            if (!dados.current) throw new Error('Resposta meteorológica sem dados atuais.');
            const atual = dados.current;
            const resumo = elemento('div', 'weather-highlight', '');
            resumo.append(
                elemento('span', 'metric-label', 'Temperatura'),
                elemento('div', 'primary-value', formatarValor(atual.temperature_2m, '°C')),
                elemento('p', 'primary-caption', estadoTempo(atual.weather_code)),
            );
            const linha = elemento('div', 'weather-row', '');
            linha.append(
                resumo,
                metricas([
                    ['Humidade', formatarValor(atual.relative_humidity_2m, '%')],
                    ['Precipitação', formatarValor(atual.precipitation, 'mm')],
                    ['Vento', formatarValor(atual.wind_speed_10m, 'km/h')],
                    ['Direção do vento', grausParaDirecao(atual.wind_direction_10m)],
                    ['Rajadas', formatarValor(atual.wind_gusts_10m, 'km/h')],
                ]),
            );
            tempo.replaceChildren(
                linha,
                elemento(
                    'p',
                    'update-note',
                    `Hora dos dados: ${formatarData(atual.time, dados.timezone)} · ${dados.timezone || 'Fuso N/D'} · Open-Meteo`,
                ),
            );
        } catch (erro) {
            console.error('Tempo:', erro);
            mostrarErro(tempo, carregarTempo);
        }
    }

    // Consulta os dados horários e apresenta o estado atual do mar.
    async function carregarMar() {
        mostrarCarregamento(mar);
        try {
            const opcoes = {
                hourly: variaveisMar.join(','),
                cell_selection: 'sea',
                forecast_days: 2,
                past_days: 1,
            };
            let dados;
            try {
                dados = await obterJSON(
                    criarURL('https://marine-api.open-meteo.com/v1/marine', opcoes),
                );
            } catch (erro) {
                // Alguns modelos rejeitam a temperatura da superfície do mar.
                if (erro.status !== 400) throw erro;
                opcoes.hourly = variaveisMar
                    .filter((nome) => nome !== 'sea_surface_temperature')
                    .join(',');
                dados = await obterJSON(
                    criarURL('https://marine-api.open-meteo.com/v1/marine', opcoes),
                );
            }
            if (!Array.isArray(dados.hourly?.time))
                throw new Error('Resposta marítima sem dados horários.');
            const indice = indiceHoraAtual(dados.hourly.time);
            const valor = (nome) => (indice < 0 ? null : dados.hourly[nome]?.[indice]);
            const principais = metricas([
                ['Altura das ondas', formatarValor(valor('wave_height'), 'm')],
                ['Período das ondas', formatarValor(valor('wave_period'), 's')],
                ['Direção das ondas', grausParaDirecao(valor('wave_direction'))],
                ['Temperatura da água', formatarValor(valor('sea_surface_temperature'), '°C')],
            ]);
            principais.classList.add('comparison-metrics');
            principais.querySelector('dd').classList.add('primary-value');
            const complementos = elemento('div', 'marine-extras', '');
            for (const [titulo, prefixo] of [
                ['Swell · Ondulação', 'swell_wave'],
                ['Ondas de vento', 'wind_wave'],
            ]) {
                const grupo = elemento('div', 'marine-extra', '');
                grupo.append(
                    elemento('h3', 'metric-group', titulo),
                    metricas([
                        ['Altura', formatarValor(valor(`${prefixo}_height`), 'm')],
                        ['Período', formatarValor(valor(`${prefixo}_period`), 's')],
                        ['Direção', grausParaDirecao(valor(`${prefixo}_direction`))],
                    ]),
                );
                complementos.append(grupo);
            }
            mar.replaceChildren(
                principais,
                complementos,
                elemento(
                    'p',
                    'update-note',
                    `Hora dos dados: ${formatarData(indice < 0 ? null : dados.hourly.time[indice], dados.timezone)} · ${dados.timezone || 'Fuso N/D'} · Open-Meteo Marine`,
                ),
            );
        } catch (erro) {
            console.error('Mar:', erro);
            mostrarErro(mar, carregarMar);
        }
    }

    // Atualiza as três fontes, mantendo as falhas independentes.
    async function carregarTudo() {
        atualizar.disabled = true;
        await Promise.allSettled([carregarTempo(), carregarMar(), consultarIPMA()]);
        atualizar.disabled = false;
    }

    // Converte texto numérico sem transformar valores vazios em zero.
    function valorIPMA(valor) {
        if (typeof valor === 'string') {
            if (!valor.trim()) return null;
            return Number(valor);
        }
        return typeof valor === 'number' ? valor : null;
    }

    // Formata o intervalo entre o mínimo e o máximo.
    function intervaloIPMA(minimo, maximo, unidade) {
        return `${formatarValor(valorIPMA(minimo), unidade)} – ${formatarValor(valorIPMA(maximo), unidade)}`;
    }

    // Apresenta os registos da previsão diária oficial.
    function apresentarIPMA(painel, dados, registos) {
        painel.replaceChildren();
        if (!registos.length) {
            painel.append(
                elemento(
                    'p',
                    'data-note',
                    'N/D — Não existe previsão IPMA correspondente a este local.',
                ),
            );
            return;
        }
        const data =
            typeof dados.forecastDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dados.forecastDate)
                ? dados.forecastDate.split('-').reverse().join('/')
                : 'N/D';
        painel.append(elemento('p', 'ipma-date', `Previsão para ${data} · Fonte: IPMA`));
        registos.forEach((registo) => {
            const cartao = elemento('div', 'ipma-forecast', '');
            const principais = metricas([
                [
                    'Altura das ondas (mín. – máx.)',
                    intervaloIPMA(registo.waveHighMin, registo.waveHighMax, 'm'),
                ],
                [
                    'Período das ondas (mín. – máx.)',
                    intervaloIPMA(registo.wavePeriodMin, registo.wavePeriodMax, 's'),
                ],
                [
                    'Direção predominante das ondas',
                    typeof registo.predWaveDir === 'string' && registo.predWaveDir.trim()
                        ? registo.predWaveDir
                        : 'N/D',
                ],
                [
                    'Temperatura da água (mín. – máx.)',
                    intervaloIPMA(registo.sstMin, registo.sstMax, '°C'),
                ],
            ]);
            principais.classList.add('comparison-metrics');
            cartao.append(
                principais,
                elemento(
                    'p',
                    'ipma-total',
                    `Mar total (mín. – máx.): ${intervaloIPMA(registo.totalSeaMin, registo.totalSeaMax, 'm')}`,
                ),
            );
            painel.append(cartao);
        });
    }

    // Obtém a previsão do dia selecionado e filtra a região atual.
    async function consultarIPMA() {
        const painel = document.querySelector('#dados-ipma');
        const botao = document.querySelector('#consultar-ipma');
        if (!parametros.get('id') && !parametros.get('idLocal')) {
            painel.textContent =
                'N/D — Escolhe uma região no catálogo para consultar a previsão oficial.';
            return;
        }
        if (botao.disabled) return;
        mostrarCarregamento(painel);
        botao.disabled = true;
        filtrosIPMA.forEach((filtro) => {
            filtro.disabled = true;
            filtro.setAttribute('aria-pressed', String(Number(filtro.dataset.dia) === diaIPMA));
        });
        try {
            const dados = await obterPrevisaoIPMA(diaIPMA);
            if (!Array.isArray(dados.data)) throw new Error('Formato inesperado do IPMA.');
            // O IPMA devolve vários locais; apresenta apenas o escolhido.
            const registos = dados.data.filter(
                (registo) =>
                    (parametros.get('id') &&
                        String(registo.globalIdLocal) === parametros.get('id')) ||
                    (parametros.get('idLocal') &&
                        String(registo.idLocal) === parametros.get('idLocal')),
            );
            apresentarIPMA(painel, dados, registos);
        } catch (erro) {
            console.error('IPMA:', erro);
            mostrarErro(painel, consultarIPMA);
        } finally {
            botao.disabled = false;
            filtrosIPMA.forEach((filtro) => {
                filtro.disabled = false;
            });
        }
    }

    // Valida as coordenadas antes de iniciar as consultas.
    if (
        !latTexto?.trim() ||
        !lonTexto?.trim() ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        const aviso = document.querySelector('#erro-local');
        aviso.hidden = false;
        aviso.textContent = 'Local inválido. Volta ao catálogo e escolhe uma região.';
        atualizar.disabled = true;
        tempo.textContent = 'N/D';
        mar.textContent = 'N/D';
        document.querySelector('#dados-ipma').textContent = 'N/D';
        document.querySelector('#consultar-ipma').disabled = true;
        filtrosIPMA.forEach((filtro) => {
            filtro.disabled = true;
        });
    } else {
        document.querySelector('#nome-local').textContent = local.replace(/,\s*Costa\s*$/i, '');
        document.title = `${local} · Estado do Mar`;
        document.querySelector('#coordenadas').textContent =
            `${latitude}° lat · ${longitude}° lon · Portugal`;
        apresentarRegiao();
        atualizar.addEventListener('click', carregarTudo);
        document.querySelector('#consultar-ipma').addEventListener('click', consultarIPMA);
        filtrosIPMA.forEach((filtro) =>
            filtro.addEventListener('click', () => {
                diaIPMA = Number(filtro.dataset.dia);
                consultarIPMA();
            }),
        );
        carregarTudo();
    }
})();
