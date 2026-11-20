import sys, os, mimetypes
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent
FLAGS = ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-web-security','--allow-file-access-from-files']
CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/'
out = ROOT/'shots'; out.mkdir(exist_ok=True)
shots = sys.argv[1].split(',') if len(sys.argv)>1 else ['S1','S2','S3','S5']
tag = sys.argv[2] if len(sys.argv)>2 else 'v001'
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=FLAGS)
    pg = br.new_page(viewport={'width':1920,'height':1080})
    pg.on('console', lambda m: print('[c]', m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: print('[err]', e))
    def serve(route):
        f = ROOT/'node_modules/three'/route.request.url[len(CDN):]
        route.fulfill(path=str(f), content_type='application/javascript')
    pg.route(CDN+'**', serve)
    pg.goto((ROOT/'preview_E1.html').as_uri())
    pg.wait_for_function('window.__ready', timeout=30000)
    for s in shots:
        pg.evaluate(f'window.shot("{s}",0.5)')
        pg.screenshot(path=str(out/f'{tag}_{s}.jpg'), type='jpeg', quality=92); print('shot', s)
    br.close()
