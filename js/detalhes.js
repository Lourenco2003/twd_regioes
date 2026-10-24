/**
 * detalhes.js — código explicado para estudo.
 * Fluxo: ler e validar a URL, associar os cliques e carregar as três fontes.
 * Atmosfera e mar horário vêm da Open-Meteo; a previsão diária oficial vem do IPMA.
 * A indentação mostra os blocos; uma chaveta de fecho termina o bloco correspondente.
 */
// Executa imediatamente esta função; as suas variáveis ficam isoladas dos outros ficheiros.
(() => {
    // Ativa o modo estrito, que ajuda a detetar erros como variáveis usadas sem declaração.
    'use strict';
    // Obtém as funções partilhadas já carregadas por utils.js; as chavetas selecionam propriedades
    // do objeto MarUtils.
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
    // Lê a parte da URL depois de ?, onde o catálogo enviou os dados da região.
    const parametros = new URLSearchParams(location.search);
    // Obtém a latitude como texto; se o parâmetro não existir, o resultado é null.
    const latTexto = parametros.get('lat');
    // Obtém a longitude como texto para poder verificar também se o parâmetro está vazio.
    const lonTexto = parametros.get('lon');
    // Converte a latitude em número para validar o intervalo e construir os pedidos.
    const latitude = Number(latTexto);
    // Converte a longitude em número; texto inválido produz NaN.
    const longitude = Number(lonTexto);
    // Obtém o nome sem espaços exteriores; usa um título genérico se não houver nome.
    const local = parametros.get('local')?.trim() || 'Região costeira';
    // Guarda em tempo o elemento HTML identificado por #tempo, para o consultar ou atualizar mais
    // à frente.
    const tempo = document.querySelector('#tempo');
    // Guarda em mar o elemento HTML identificado por #mar, para o consultar ou atualizar mais à
    // frente.
    const mar = document.querySelector('#mar');
    // Guarda em atualizar o elemento HTML identificado por #atualizar, para o consultar ou
    // atualizar mais à frente.
    const atualizar = document.querySelector('#atualizar');
    // Obtém todos os botões de dia e transforma a coleção de elementos numa lista JavaScript.
    const filtrosIPMA = [...document.querySelectorAll('[data-dia]')];
    // Seleciona hoje por defeito; 1 representa amanhã e 2 representa depois de amanhã.
    let diaIPMA = 0;
    // Inicia a lista de campos marítimos a pedir: altura, direção e período das ondas, seguidos do
    // swell.
    const variaveisMar = [
        'wave_height', // Altura significativa das ondas, em metros.
        'wave_direction', // Direção de proveniência das ondas, em graus.
        'wave_period', // Período das ondas, em segundos.
        'swell_wave_height', // Altura do swell (ondulação), em metros.
        // Inclui direção e período do swell, bem como altura e direção das ondas causadas pelo
        // vento.
        'swell_wave_direction', // Direção de proveniência do swell, em graus.
        'swell_wave_period', // Período do swell, em segundos.
        'wind_wave_height', // Altura das ondas causadas pelo vento, em metros.
        'wind_wave_direction', // Direção das ondas causadas pelo vento, em graus.
        // Completa a lista com o período das ondas de vento e a temperatura da superfície do mar.
        'wind_wave_period', // Período das ondas causadas pelo vento, em segundos.
        'sea_surface_temperature', // Temperatura da superfície do mar, em graus Celsius.
    ];

    // Constrói o endereço da Open-Meteo com as coordenadas da região e os parâmetros específicos
    // do pedido.
    function criarURL(base, opcoes) {
        // Codifica coordenadas e opções na URL; auto escolhe o fuso do local, unixtime pede
        // segundos Unix e ...opcoes acrescenta os restantes campos.
        return `${base}?${new URLSearchParams({ latitude, longitude, timezone: 'auto', timeformat: 'unixtime', ...opcoes })}`;
    }

    // Cria um elemento HTML, atribui-lhe classes CSS e escreve texto sem interpretar HTML.
    function elemento(tag, classe, texto) {
        // Cria o elemento tag e guarda-o em item; ainda não é visível até ser inserido no
        // documento.
        const item = document.createElement(tag);
        // Aplica ao elemento as classes CSS recebidas pela função.
        item.className = classe;
        // Insere o conteúdo como texto, evitando que nomes ou dados sejam tratados como código
        // HTML.
        item.textContent = texto;
        // Entrega o elemento criado a quem chamou a função, para que o possa inserir na página.
        return item;
    }

    // Transforma pares [nome, valor] numa lista HTML de definições: dl contém dt e dd.
    function metricas(pares) {
        // Cria a lista semântica de definições onde serão inseridos os nomes e valores das
        // medidas.
        const lista = elemento('dl', 'metrics', '');
        // Percorre os pares e separa cada um em nome da medida e valor a apresentar.
        pares.forEach(([nome, valor]) => {
            // Cria o elemento 'div' e guarda-o em grupo; ainda não é visível até ser inserido no
            // documento.
            const grupo = document.createElement('div');
            // Cria dt para o nome e dd para o valor, juntando ambos no grupo da medida.
            grupo.append(elemento('dt', '', nome), elemento('dd', '', valor));
            // Insere grupo dentro de lista, pela ordem indicada.
            lista.append(grupo);
        });
        // Devolve a lista de medidas já construída, pronta a inserir numa secção.
        return lista;
    }

    // Obtém as condições atuais da atmosfera e atualiza apenas a secção do tempo.
    async function carregarTempo() {
        // Mostra o estado A carregar dados na área tempo antes de iniciar o pedido.
        mostrarCarregamento(tempo);
        // Começa o bloco protegido: os erros lançados aqui serão tratados por catch ou seguidos da
        // limpeza em finally.
        try {
            // Constrói e consulta o endereço meteorológico da Open-Meteo para esta região.
            const dados = await obterJSON(
                criarURL('https://api.open-meteo.com/v1/forecast', {
                    // Pede temperatura, humidade, precipitação, código do tempo, vento, direção e
                    // rajadas atuais.
                    current:
                        'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
                    // Pede explicitamente velocidades em quilómetros por hora.
                    wind_speed_unit: 'kmh',
                }),
            );
            // Não tenta apresentar condições atuais se a resposta não contiver o objeto current.
            if (!dados.current) throw new Error('Resposta meteorológica sem dados atuais.');
            // Guarda os dados atuais numa variável com nome mais curto para as linhas de
            // apresentação.
            const atual = dados.current;
            // Cria resumo como elemento div com a classe weather-highlight, inicialmente sem
            // texto.
            const resumo = elemento('div', 'weather-highlight', '');
            // Começa o destaque meteorológico com a legenda da temperatura.
            resumo.append(
                elemento('span', 'metric-label', 'Temperatura'),
                // Cria o valor principal da temperatura, formatado em graus Celsius.
                elemento('div', 'primary-value', formatarValor(atual.temperature_2m, '°C')),
                // Acrescenta a descrição portuguesa do estado do tempo e termina o destaque.
                elemento('p', 'primary-caption', estadoTempo(atual.weather_code)),
            );
            // Cria linha como elemento div com a classe weather-row, inicialmente sem texto.
            const linha = elemento('div', 'weather-row', '');
            // Junta o destaque e a lista de medidas que será apresentada horizontalmente no
            // computador.
            linha.append(
                resumo,
                metricas([
                    // Define a medida Humidade e o seu valor formatado; valores ausentes continuam
                    // a aparecer como N/D.
                    ['Humidade', formatarValor(atual.relative_humidity_2m, '%')],
                    // Define a medida Precipitação e o seu valor formatado; valores ausentes
                    // continuam a aparecer como N/D.
                    ['Precipitação', formatarValor(atual.precipitation, 'mm')],
                    // Define a medida Vento e o seu valor formatado; valores ausentes continuam a
                    // aparecer como N/D.
                    ['Vento', formatarValor(atual.wind_speed_10m, 'km/h')],
                    // Define a medida Direção do vento e o seu valor formatado; valores ausentes
                    // continuam a aparecer como N/D.
                    ['Direção do vento', grausParaDirecao(atual.wind_direction_10m)],
                    // Define a medida Rajadas e o seu valor formatado; valores ausentes continuam
                    // a aparecer como N/D.
                    ['Rajadas', formatarValor(atual.wind_gusts_10m, 'km/h')],
                ]),
            );
            // Substitui o carregamento pela linha de dados e pela indicação da hora.
            tempo.replaceChildren(
                linha,
                // Acrescenta a hora de validade dos dados no fuso da região e a identificação da
                // fonte; não é uma hora de medição local.
                elemento(
                    'p',
                    'update-note',
                    `Hora dos dados: ${formatarData(atual.time, dados.timezone)} · ${dados.timezone || 'Fuso N/D'} · Open-Meteo`,
                ),
            );
        } catch (erro) {
            // Recebe erros do pedido ou da validação para evitar que a interface fique sem
            // explicação.
            // Regista os detalhes do erro na consola para diagnosticar problemas na secção Tempo.
            console.error('Tempo:', erro);
            // Mostra um erro na área tempo e permite repetir através da função carregarTempo.
            mostrarErro(tempo, carregarTempo);
        }
    }

    // Obtém dados horários do mar, seleciona a hora atual disponível e apresenta ondas, swell e
    // ondas de vento.
    async function carregarMar() {
        // Mostra o estado A carregar dados na área mar antes de iniciar o pedido.
        mostrarCarregamento(mar);
        // Começa o bloco protegido: os erros lançados aqui serão tratados por catch ou seguidos da
        // limpeza em finally.
        try {
            // Pede campos horários, uma célula marítima, dois dias de previsão e um dia anterior
            // para cobrir mudanças de dia.
            const opcoes = {
                // Junta os nomes dos campos com vírgulas no parâmetro hourly.
                hourly: variaveisMar.join(','),
                // Pede uma célula de previsão localizada no mar, em vez de uma célula terrestre.
                cell_selection: 'sea',
                // Inclui o dia de hoje e o seguinte no intervalo da previsão.
                forecast_days: 2,
                // Inclui também o dia anterior, útil junto à meia-noite local.
                past_days: 1,
            };
            // Reserva a variável que receberá a resposta marítima, incluindo uma eventual
            // tentativa alternativa.
            let dados;
            // Começa o bloco protegido: os erros lançados aqui serão tratados por catch ou
            // seguidos da limpeza em finally.
            try {
                // Consulta a API marítima com as opções definidas e espera pela resposta.
                dados = await obterJSON(
                    criarURL('https://marine-api.open-meteo.com/v1/marine', opcoes),
                );
            } catch (erro) {
                // Recebe erros do pedido ou da validação para evitar que a interface fique sem
                // explicação.
                // Só faz a tentativa alternativa para HTTP 400; outros erros seguem para o
                // tratamento exterior.
                if (erro.status !== 400) throw erro;
                // Retira a temperatura do mar e repete o pedido, pois alguns modelos podem não
                // suportar esse campo.
                opcoes.hourly = variaveisMar
                    .filter((nome) => nome !== 'sea_surface_temperature')
                    .join(',');
                // Consulta a API marítima com as opções definidas e espera pela resposta.
                dados = await obterJSON(
                    criarURL('https://marine-api.open-meteo.com/v1/marine', opcoes),
                );
            }
            // Confirma que existe uma lista de horas antes de procurar a hora atual disponível.
            if (!Array.isArray(dados.hourly?.time))
                throw new Error('Resposta marítima sem dados horários.');
            // Determina a posição da hora mais recente válida na resposta da API.
            const indice = indiceHoraAtual(dados.hourly.time);
            // Cria um atalho para obter um campo à hora escolhida; sem hora válida devolve null.
            const valor = (nome) => (indice < 0 ? null : dados.hourly[nome]?.[indice]);
            // Começa as quatro medidas principais, na mesma ordem nas duas fontes para facilitar a
            // comparação.
            const principais = metricas([
                // Define a medida Altura das ondas e o seu valor formatado; valores ausentes
                // continuam a aparecer como N/D.
                ['Altura das ondas', formatarValor(valor('wave_height'), 'm')],
                // Define a medida Período das ondas e o seu valor formatado; valores ausentes
                // continuam a aparecer como N/D.
                ['Período das ondas', formatarValor(valor('wave_period'), 's')],
                // Define a medida Direção das ondas e o seu valor formatado; valores ausentes
                // continuam a aparecer como N/D.
                ['Direção das ondas', grausParaDirecao(valor('wave_direction'))],
                // Define a medida Temperatura da água e o seu valor formatado; valores ausentes
                // continuam a aparecer como N/D.
                ['Temperatura da água', formatarValor(valor('sea_surface_temperature'), '°C')],
            ]);
            // Aplica a grelha horizontal comum às previsões marítimas.
            principais.classList.add('comparison-metrics');
            // Marca a primeira medida, a altura das ondas, como valor principal.
            principais.querySelector('dd').classList.add('primary-value');
            // Cria complementos como elemento div com a classe marine-extras, inicialmente sem
            // texto.
            const complementos = elemento('div', 'marine-extras', '');
            // Repete a construção para swell e ondas de vento, mudando o título e o prefixo dos
            // campos da API.
            for (const [titulo, prefixo] of [
                ['Swell · Ondulação', 'swell_wave'],
                ['Ondas de vento', 'wind_wave'],
            ]) {
                // Cria grupo como elemento div com a classe marine-extra, inicialmente sem texto.
                const grupo = elemento('div', 'marine-extra', '');
                // Cria o subtítulo deste grupo e a sua lista de altura, período e direção.
                grupo.append(
                    elemento('h3', 'metric-group', titulo),
                    metricas([
                        // Define a medida Altura e o seu valor formatado; valores ausentes
                        // continuam a aparecer como N/D.
                        ['Altura', formatarValor(valor(`${prefixo}_height`), 'm')],
                        // Define a medida Período e o seu valor formatado; valores ausentes
                        // continuam a aparecer como N/D.
                        ['Período', formatarValor(valor(`${prefixo}_period`), 's')],
                        // Define a medida Direção e o seu valor formatado; valores ausentes
                        // continuam a aparecer como N/D.
                        ['Direção', grausParaDirecao(valor(`${prefixo}_direction`))],
                    ]),
                );
                // Insere grupo dentro de complementos, pela ordem indicada.
                complementos.append(grupo);
            }
            // Substitui o carregamento pelas medidas principais, grupos complementares e hora dos
            // dados.
            mar.replaceChildren(
                principais,
                complementos,
                // Acrescenta a hora de validade dos dados no fuso da região e a identificação da
                // fonte; não é uma hora de medição local.
                elemento(
                    'p',
                    'update-note',
                    `Hora dos dados: ${formatarData(indice < 0 ? null : dados.hourly.time[indice], dados.timezone)} · ${dados.timezone || 'Fuso N/D'} · Open-Meteo Marine`,
                ),
            );
        } catch (erro) {
            // Recebe erros do pedido ou da validação para evitar que a interface fique sem
            // explicação.
            // Regista os detalhes do erro na consola para diagnosticar problemas na secção Mar.
            console.error('Mar:', erro);
            // Mostra um erro na área mar e permite repetir através da função carregarMar.
            mostrarErro(mar, carregarMar);
        }
    }

    // Atualiza as três fontes em paralelo e impede novos cliques no botão geral durante a
    // atualização.
    async function carregarTudo() {
        // Desativa o botão geral para impedir cliques repetidos durante a atualização.
        atualizar.disabled = true;
        // Inicia as três consultas em paralelo e espera por todas, mesmo que uma delas falhe.
        await Promise.allSettled([carregarTempo(), carregarMar(), consultarIPMA()]);
        // Volta a permitir uma nova atualização depois de as consultas terminarem.
        atualizar.disabled = false;
    }

    // Converte medidas numéricas do IPMA, que podem chegar como texto, preservando valores
    // ausentes.
    function valorIPMA(valor) {
        // Trata primeiro os valores numéricos que o IPMA enviou em formato de texto.
        if (typeof valor === 'string') {
            // Considera texto vazio ou só com espaços como informação ausente, sem o converter em
            // zero.
            if (!valor.trim()) return null;
            // Converte o texto em número; texto não numérico torna-se NaN e será apresentado como
            // N/D.
            return Number(valor);
        }
        // Mantém números que já chegaram como number; os restantes tipos representam ausência de
        // informação.
        return typeof valor === 'number' ? valor : null;
    }

    // Apresenta o mínimo e o máximo com unidades, sem substituir dados ausentes por zeros.
    function intervaloIPMA(minimo, maximo, unidade) {
        // Converte e formata separadamente mínimo e máximo, incluindo a unidade de cada extremo.
        return `${formatarValor(valorIPMA(minimo), unidade)} – ${formatarValor(valorIPMA(maximo), unidade)}`;
    }

    // Apresenta os registos oficiais em cartões comparáveis com os valores da Open-Meteo.
    function apresentarIPMA(painel, dados, registos) {
        // Remove o conteúdo anterior de painel para preparar a nova apresentação.
        painel.replaceChildren();
        // Verifica se o IPMA não devolveu qualquer registo correspondente ao local selecionado.
        if (!registos.length) {
            // Mostra uma explicação quando não há previsão oficial correspondente.
            painel.append(
                elemento(
                    'p',
                    'data-note',
                    'N/D — Não existe previsão IPMA correspondente a este local.',
                ),
            );
            // Termina esta função neste ponto, sem executar as instruções que aparecem a seguir.
            return;
        }
        // Confirma que a data da previsão tem o formato ano-mês-dia antes de a reorganizar.
        const data =
            typeof dados.forecastDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dados.forecastDate)
                ? // Transforma ano-mês-dia em dia/mês/ano; sem data válida apresenta N/D.
                  dados.forecastDate.split('-').reverse().join('/')
                : 'N/D';
        // Identifica a data a que a previsão se refere e a respetiva fonte.
        painel.append(elemento('p', 'ipma-date', `Previsão para ${data} · Fonte: IPMA`));
        // Apresenta cada registo correspondente à região, sem assumir que só pode existir um.
        registos.forEach((registo) => {
            // Cria cartao como elemento div com a classe ipma-forecast, inicialmente sem texto.
            const cartao = elemento('div', 'ipma-forecast', '');
            // Começa as quatro medidas principais, na mesma ordem nas duas fontes para facilitar a
            // comparação.
            const principais = metricas([
                // Define a medida Altura das ondas (mín. – máx.) e o seu valor formatado; valores
                // ausentes continuam a aparecer como N/D.
                [
                    'Altura das ondas (mín. – máx.)',
                    intervaloIPMA(registo.waveHighMin, registo.waveHighMax, 'm'),
                ],
                // Define a medida Período das ondas (mín. – máx.) e o seu valor formatado; valores
                // ausentes continuam a aparecer como N/D.
                [
                    'Período das ondas (mín. – máx.)',
                    intervaloIPMA(registo.wavePeriodMin, registo.wavePeriodMax, 's'),
                ],
                // Define a medida Direção predominante das ondas e o seu valor formatado; valores
                // ausentes continuam a aparecer como N/D.
                [
                    'Direção predominante das ondas',
                    typeof registo.predWaveDir === 'string' && registo.predWaveDir.trim()
                        ? registo.predWaveDir
                        : 'N/D',
                ],
                // Define a medida Temperatura da água (mín. – máx.) e o seu valor formatado;
                // valores ausentes continuam a aparecer como N/D.
                [
                    'Temperatura da água (mín. – máx.)',
                    intervaloIPMA(registo.sstMin, registo.sstMax, '°C'),
                ],
            ]);
            // Aplica a grelha horizontal comum às previsões marítimas.
            principais.classList.add('comparison-metrics');
            // Junta as quatro medidas e uma linha extra com o intervalo de mar total fornecido
            // pelo IPMA.
            cartao.append(
                principais,
                elemento(
                    'p',
                    'ipma-total',
                    `Mar total (mín. – máx.): ${intervaloIPMA(registo.totalSeaMin, registo.totalSeaMax, 'm')}`,
                ),
            );
            // Insere cartao dentro de painel, pela ordem indicada.
            painel.append(cartao);
        });
    }

    // Consulta o dia selecionado no IPMA e mantém apenas os registos da região escolhida.
    async function consultarIPMA() {
        // Guarda em painel o elemento HTML identificado por #dados-ipma, para o consultar ou
        // atualizar mais à frente.
        const painel = document.querySelector('#dados-ipma');
        // Guarda em botao o elemento HTML identificado por #consultar-ipma, para o consultar ou
        // atualizar mais à frente.
        const botao = document.querySelector('#consultar-ipma');
        // Deteta URLs sem identificador do IPMA; as coordenadas sozinhas não permitem filtrar
        // estes registos.
        if (!parametros.get('id') && !parametros.get('idLocal')) {
            // Explica como obter uma URL com o identificador necessário à previsão oficial.
            painel.textContent =
                'N/D — Escolhe uma região no catálogo para consultar a previsão oficial.';
            // Termina esta função neste ponto, sem executar as instruções que aparecem a seguir.
            return;
        }
        // Não inicia uma segunda consulta oficial enquanto a primeira estiver em curso.
        if (botao.disabled) return;
        // Mostra o estado A carregar dados na área painel antes de iniciar o pedido.
        mostrarCarregamento(painel);
        // Impede atualizar o IPMA repetidamente enquanto se espera pela resposta.
        botao.disabled = true;
        // Percorre os botões dos três dias para atualizar o seu estado.
        filtrosIPMA.forEach((filtro) => {
            // Impede trocar de dia antes de a consulta em curso terminar.
            filtro.disabled = true;
            // Marca como selecionado apenas o botão cujo data-dia corresponde ao dia escolhido;
            // atualiza também a acessibilidade.
            filtro.setAttribute('aria-pressed', String(Number(filtro.dataset.dia) === diaIPMA));
        });
        // Começa o bloco protegido: os erros lançados aqui serão tratados por catch ou seguidos da
        // limpeza em finally.
        try {
            // Consulta o ficheiro oficial relativo ao dia que o utilizador selecionou.
            const dados = await obterPrevisaoIPMA(diaIPMA);
            // Confirma que a previsão oficial contém a lista de registos esperada.
            if (!Array.isArray(dados.data)) throw new Error('Formato inesperado do IPMA.');
            // Filtra a resposta oficial para apresentar apenas registos da região aberta.
            const registos = dados.data.filter(
                (registo) =>
                    // Aceita um registo quando o seu globalIdLocal coincide com o identificador
                    // recebido na URL.
                    (parametros.get('id') &&
                        String(registo.globalIdLocal) === parametros.get('id')) ||
                    // Em alternativa, aceita uma correspondência por idLocal; String uniformiza a
                    // comparação com a URL.
                    (parametros.get('idLocal') &&
                        String(registo.idLocal) === parametros.get('idLocal')),
            );
            // Desenha a previsão oficial usando os dados e os registos filtrados.
            apresentarIPMA(painel, dados, registos);
        } catch (erro) {
            // Recebe erros do pedido ou da validação para evitar que a interface fique sem
            // explicação.
            // Regista os detalhes do erro na consola para diagnosticar problemas na secção IPMA.
            console.error('IPMA:', erro);
            // Mostra um erro na área painel e permite repetir através da função consultarIPMA.
            mostrarErro(painel, consultarIPMA);
        } finally {
            // Executa a limpeza final tanto quando o pedido funciona como quando ocorre um
            // erro.
            // Reativa o botão do IPMA, quer o pedido tenha funcionado quer tenha ocorrido um erro.
            botao.disabled = false;
            // Volta a permitir selecionar qualquer um dos três dias.
            filtrosIPMA.forEach((filtro) => {
                filtro.disabled = false;
            });
        }
    }
    // Deteta coordenadas em falta, vazias ou que não se conseguem converter em números finitos.
    if (
        !latTexto?.trim() ||
        !lonTexto?.trim() ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        // Acrescenta a validação geográfica: latitude entre -90 e 90 e longitude entre -180 e 180.
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        // Guarda em aviso o elemento HTML identificado por #erro-local, para o consultar ou
        // atualizar mais à frente.
        const aviso = document.querySelector('#erro-local');
        // Mostra o aviso de local inválido, que no HTML começa oculto.
        aviso.hidden = false;
        // Orienta o utilizador a escolher um local válido a partir do catálogo.
        aviso.textContent = 'Local inválido. Volta ao catálogo e escolhe uma região.';
        // Desativa o botão geral para impedir cliques repetidos durante a atualização.
        atualizar.disabled = true;
        // Indica que não há dados meteorológicos para uma URL com coordenadas inválidas.
        tempo.textContent = 'N/D';
        // Indica que não há dados marítimos para uma URL com coordenadas inválidas.
        mar.textContent = 'N/D';
        // Apresenta também N/D na área oficial, em vez de a deixar vazia.
        document.querySelector('#dados-ipma').textContent = 'N/D';
        // Impede consultar o IPMA a partir de um local inválido.
        document.querySelector('#consultar-ipma').disabled = true;
        // Desativa a escolha dos dias quando o local não passou a validação.
        filtrosIPMA.forEach((filtro) => {
            filtro.disabled = true;
        });
        // Executa a alternativa quando a condição anterior não se verifica.
    } else {
        // Escreve o nome da região no título visível, retirando apenas o sufixo Costa.
        document.querySelector('#nome-local').textContent = local.replace(/,\s*Costa\s*$/i, '');
        // Atualiza o título que aparece no separador do navegador.
        document.title = `${local} · Estado do Mar`;
        // Mostra as coordenadas originais do local recebido do catálogo.
        document.querySelector('#coordenadas').textContent =
            `${latitude}° lat · ${longitude}° lon · Portugal`;
        // Liga o botão geral à atualização das três fontes, mantendo o dia escolhido no IPMA.
        atualizar.addEventListener('click', carregarTudo);
        // Liga o botão de atualização oficial à nova consulta do dia selecionado.
        document.querySelector('#consultar-ipma').addEventListener('click', consultarIPMA);
        // Associa a cada botão de dia uma função que será executada quando esse botão for clicado.
        filtrosIPMA.forEach((filtro) =>
            filtro.addEventListener('click', () => {
                // Lê o atributo data-dia do botão e guarda o seu número como dia atualmente
                // selecionado.
                diaIPMA = Number(filtro.dataset.dia);
                // Atualiza a previsão oficial para o dia atualmente selecionado.
                consultarIPMA();
            }),
        );
        // Inicia automaticamente as três fontes; a primeira consulta do IPMA é a de hoje.
        carregarTudo();
    }
})();
