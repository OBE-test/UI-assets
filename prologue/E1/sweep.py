import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent; CDN='https://cdn.jsdelivr.net/npm/three@0.170.0/'
FLAGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--allow-file-access-from-files']
# usage: sweep.py page shot variant tag js_setup
page, shot, var, tag, js = sys.argv[1:6]
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=FLAGS); pg=br.new_page(viewport={'width':1920,'height':1080})
    pg.on('pageerror',lambda e:print('[err]',e))
    pg.route(CDN+'**',lambda r:r.fulfill(path=str(ROOT/'node_modules/three'/r.request.url[len(CDN):]),content_type='application/javascript'))
    pg.goto((ROOT/page).as_uri()); pg.wait_for_function('window.__ready',timeout=30000)
    pg.evaluate(js); pg.evaluate(f'window.shot("{shot}",0.5,"{var}")')
    pg.screenshot(path=str(ROOT/'shots'/f'{tag}.jpg'),type='jpeg',quality=90); br.close()
