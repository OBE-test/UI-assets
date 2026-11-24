import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent; CDN='https://cdn.jsdelivr.net/npm/three@0.170.0/'
FLAGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--allow-file-access-from-files']
looks=sys.argv[1].split(','); tag=sys.argv[2]; js=sys.argv[3] if len(sys.argv)>3 else ''
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=FLAGS); pg=br.new_page(viewport={'width':1080,'height':1620})
    pg.on('pageerror',lambda e:print('[err]',e)); pg.on('console',lambda m:print('[c]',m.text) if m.type=='error' else None)
    pg.route(CDN+'**',lambda r:r.fulfill(path=str(ROOT/'node_modules/three'/r.request.url[len(CDN):]),content_type='application/javascript'))
    pg.goto((ROOT/'preview_E4_2.html').as_uri()); pg.wait_for_function('window.__ready',timeout=60000)
    if js: pg.evaluate(js)
    for l in looks:
        pg.evaluate(f'window.look("{l}",2)'); pg.screenshot(path=str(ROOT/'shots'/f'{tag}_{l}.jpg'),type='jpeg',quality=90); print('ok',l)
    br.close()
