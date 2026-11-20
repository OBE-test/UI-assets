import subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent; CDN='https://cdn.jsdelivr.net/npm/three@0.170.0/'
FLAGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--allow-file-access-from-files']
fps=30
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=FLAGS); pg=br.new_page(viewport={'width':1920,'height':1080})
    pg.route(CDN+'**',lambda r:r.fulfill(path=str(ROOT/'node_modules/three'/r.request.url[len(CDN):]),content_type='application/javascript'))
    pg.goto((ROOT/'preview_E1.html').as_uri()); pg.wait_for_function('window.__ready',timeout=30000)
    D=pg.evaluate('window.DURATION'); n=int(D*fps)
    ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(fps),'-i','-','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(ROOT/'shots/E1_v001_4shots.mp4')],stdin=subprocess.PIPE)
    for i in range(n):
        pg.evaluate(f'window.seek({i/fps})'); ff.stdin.write(pg.screenshot(type='jpeg',quality=93))
    ff.stdin.close(); ff.wait(); br.close(); print('frames',n)
