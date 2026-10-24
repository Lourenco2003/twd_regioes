"""Testes com respostas simuladas: não consultam nem validam os fornecedores reais."""
import json
import shutil
import time
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8000'
DETALHES = '/detalhes.html?lat=40.1417&lon=-8.8783&local=Figueira%20da%20Foz&id=1060526&idLocal=302'

class Aplicacao(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path=shutil.which("chromium"))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.page = self.browser.new_page()
        self.erros = []
        self.page.on('pageerror', lambda erro: self.erros.append(str(erro)))
        self.page.route('https://cdn.jsdelivr.net/**', lambda rota: rota.abort())
        self.page.route('https://api.ipma.pt/**', self.ipma)
        self.page.route('https://api.open-meteo.com/**', self.tempo)
        self.page.route('https://marine-api.open-meteo.com/**', self.mar)

    def tearDown(self):
        self.assertEqual(self.erros, [])
        self.page.close()

    def responder(self, rota, dados, status=200):
        rota.fulfill(status=status, content_type='application/json', body=json.dumps(dados))

    def ipma(self, rota):
        if 'sea-locations' in rota.request.url:
            self.responder(rota, [
                {'local': 'Figueira da Foz, Costa', 'latitude': '40.1417', 'longitude': '-8.8783', 'globalIdLocal': 1060526, 'idLocal': 302},
                {'local': 'São Miguel, Costa', 'latitude': '37.7', 'longitude': '-25.6', 'idRegiao': 3}])
        else:
            self.responder(rota, {'forecastDate': '2026-10-22', 'data': [{'globalIdLocal': 1060526, 'waveHighMin': '2.2', 'waveHighMax': '2.7', 'wavePeriodMin': '6.2', 'wavePeriodMax': '9.0', 'totalSeaMin': 2, 'totalSeaMax': 2.5, 'sstMin': '14.5', 'sstMax': '14.7', 'predWaveDir': 'NW'}]})

    def tempo(self, rota):
        self.responder(rota, {'timezone': 'Europe/Lisbon', 'current': {
            'time': int(time.time()), 'temperature_2m': 18, 'relative_humidity_2m': 74,
            'precipitation': 0, 'weather_code': 0, 'wind_speed_10m': 15,
            'wind_direction_10m': 315, 'wind_gusts_10m': 25}})

    def mar(self, rota):
        hora = int(time.time()) // 3600 * 3600
        self.responder(rota, {'timezone': 'Europe/Lisbon', 'hourly': {
            'time': [hora - 3600, hora, hora + 3600], 'wave_height': [9, 1.8, 8],
            'wave_direction': [0, 315, 0], 'wave_period': [0, 11, 0],
            'swell_wave_height': [0, 1.5, 0], 'sea_surface_temperature': [0, None, 0]}})

    def test_fluxo_pesquisa_e_detalhes(self):
        self.page.goto(BASE)
        self.page.get_by_role('link', name='Descobre como estão as ondas').click()
        self.page.locator('.region-card').first.wait_for()
        self.assertEqual(self.page.locator('.region-card').count(), 2)
        self.page.locator('#pesquisa').fill('sao')
        self.assertEqual(self.page.locator('.region-card').count(), 1)
        self.page.locator('#pesquisa').fill('figueira')
        self.page.get_by_role('link', name='Ver condições — Figueira').click()
        self.page.wait_for_function("document.querySelector('#mar').textContent.includes('1,8 m')")
        self.assertIn('18 °C', self.page.locator('#tempo').inner_text())
        self.assertIn('Céu limpo', self.page.locator('#tempo').inner_text())
        self.assertIn('NW', self.page.locator('#mar').inner_text())
        self.assertIn('N/D', self.page.locator('#mar').inner_text())
        self.assertNotIn('9 m', self.page.locator('#mar').inner_text())
        self.page.wait_for_function("document.querySelector('#dados-ipma').textContent.includes('2,2 m – 2,7 m')")
        texto = self.page.locator('#dados-ipma').inner_text()
        self.assertIn('22/10/2026', texto)
        self.assertIn('14,5 °C – 14,7 °C', texto)
        self.assertIn('6,2 s – 9 s', texto)
        self.assertIn('NW', texto)
        self.assertNotIn('globalIdLocal', texto)

    def test_ipma_dias_e_valores_ausentes(self):
        pedidos = []
        def ipma(rota):
            pedidos.append(rota.request.url)
            self.responder(rota, {'data': [{'globalIdLocal': 1060526, 'waveHighMin': '', 'waveHighMax': None, 'sstMin': '0', 'sstMax': 'texto'}]})
        self.page.route('https://api.ipma.pt/**', ipma)
        self.page.goto(BASE + DETALHES)
        self.page.wait_for_function("!document.querySelector('[data-dia=\"1\"]').disabled")
        self.page.locator('[data-dia="1"]').click()
        self.page.wait_for_function("!document.querySelector('[data-dia=\"1\"]').disabled")
        texto = self.page.locator('#dados-ipma').inner_text()
        self.assertIn('N/D – N/D', texto)
        self.assertIn('0 °C – N/D', texto)
        self.assertIn('day0.json', pedidos[0])
        self.assertIn('day1.json', pedidos[-1])
        self.page.locator('[data-dia="2"]').click()
        self.page.wait_for_function("!document.querySelector('[data-dia=\"2\"]').disabled")
        self.assertIn('day2.json', pedidos[-1])

    def test_erros_independentes_e_repeticao(self):
        self.page.route('https://api.open-meteo.com/**', lambda rota: self.responder(rota, {}, 503))
        self.page.goto(BASE + DETALHES)
        self.page.locator('#tempo .error-panel').wait_for()
        self.page.wait_for_function("document.querySelector('#mar').textContent.includes('1,8 m')")
        self.page.unroute('https://api.open-meteo.com/**')
        self.page.route('https://api.open-meteo.com/**', self.tempo)
        self.page.locator('#tempo button').click()
        self.page.wait_for_function("document.querySelector('#tempo').textContent.includes('18 °C')")

    def test_catalogo_falha_e_vazio(self):
        self.page.route('https://api.ipma.pt/**', lambda rota: self.responder(rota, {}, 503))
        self.page.goto(BASE + '/catalogo.html')
        self.page.locator('.error-panel').wait_for()
        self.page.unroute('https://api.ipma.pt/**')
        self.page.route('https://api.ipma.pt/**', lambda rota: self.responder(rota, {'data': []}))
        self.page.get_by_role('button', name='Tentar novamente').click()
        self.page.wait_for_function("document.querySelector('#estado').textContent.includes('Não foram encontradas')")

    def test_coordenadas_invalidas_sem_pedidos(self):
        pedidos = []
        self.page.on('request', lambda pedido: pedidos.append(pedido.url))
        self.page.goto(BASE + '/detalhes.html?lat=&lon=abc')
        self.assertTrue(self.page.locator('#erro-local').is_visible())
        self.assertFalse(any('open-meteo' in url for url in pedidos))

    def test_fallback_temperatura_mar(self):
        pedidos = []
        def resposta(rota):
            pedidos.append(rota.request.url)
            if 'sea_surface_temperature' in rota.request.url:
                self.responder(rota, {'error': True}, 400)
            else:
                self.mar(rota)
        self.page.route('https://marine-api.open-meteo.com/**', resposta)
        self.page.goto(BASE + DETALHES)
        self.page.wait_for_function("document.querySelector('#mar').textContent.includes('1,8 m')")
        self.assertEqual(len(pedidos), 2)

    def test_utilitarios(self):
        self.page.goto(BASE + '/catalogo.html')
        resultado = self.page.evaluate('''async () => {
            const u = window.MarUtils;
            return [u.grausParaDirecao(360), u.grausParaDirecao(-45),
                u.grausParaDirecao(null), u.formatarValor(null), u.formatarValor(0, 'mm'),
                u.indiceHoraAtual([100, 3700, 7300], 4000),
                u.indiceHoraAtual([100], 10000), u.estadoTempo(null)];
        }''')
        self.assertEqual(resultado, ['N', 'NW', 'N/D', 'N/D', '0 mm', 1, -1, 'N/D'])

    def test_navegador_sem_abortsignal_timeout(self):
        self.page.add_init_script('AbortSignal.timeout = undefined;')
        self.page.goto(BASE + '/catalogo.html')
        self.page.locator('.region-card').first.wait_for()
        self.assertEqual(self.page.locator('.region-card').count(), 2)
        self.assertEqual(self.page.locator('script[type="module"]').count(), 0)

    def test_ordem_horizontal_e_ipma_automatico(self):
        self.page.set_viewport_size({'width': 1440, 'height': 1000})
        self.page.goto(BASE + DETALHES)
        self.page.locator('#dados-ipma .comparison-metrics').wait_for()
        ordem = self.page.evaluate("""() => ['#tempo', '#mar', '#oficial'].map(seletor => document.querySelector(seletor).getBoundingClientRect().top)""")
        self.assertLess(ordem[0], ordem[1])
        self.assertLess(ordem[1], ordem[2])
        for seletor in ['#tempo .metrics', '#mar .comparison-metrics', '#dados-ipma .comparison-metrics']:
            topos = self.page.locator(seletor + ' > div').evaluate_all('(itens) => itens.map(item => item.getBoundingClientRect().top)')
            self.assertLess(max(topos) - min(topos), 2)
        self.assertEqual(self.page.locator('[data-dia="0"]').get_attribute('aria-pressed'), 'true')
        self.page.locator('[data-dia="1"]').click()
        self.page.wait_for_function("!document.querySelector('[data-dia=\"1\"]').disabled")
        self.assertEqual(self.page.locator('[data-dia="1"]').get_attribute('aria-pressed'), 'true')
        self.assertEqual(self.page.locator('[data-dia="0"]').get_attribute('aria-pressed'), 'false')

    def test_responsividade(self):
        for largura in [390, 768, 1440]:
            self.page.set_viewport_size({'width': largura, 'height': 900})
            for caminho in ['/', '/catalogo.html', DETALHES]:
                self.page.goto(BASE + caminho)
                if 'catalogo' in caminho:
                    self.page.locator('.region-card').first.wait_for()
                if 'detalhes' in caminho:
                    self.page.wait_for_function("document.querySelector('#mar').textContent.includes('1,8 m')")
                self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth'), caminho)

if __name__ == '__main__':
    unittest.main(verbosity=2)
