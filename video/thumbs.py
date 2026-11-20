#!/usr/bin/env python3
"""给 effects/ 里每个效果出一张缩略图 → effects/thumbs/<id>.jpg（640x360，t=3s）"""
import json, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'video'))
from render import CHROME, FLAGS
ids = json.loads(subprocess.check_output(['node', '-e',
  'global.window={};eval(require("fs").readFileSync(process.argv[1],"utf8"));console.log(JSON.stringify(window.FXLIB.FX.map(f=>f.id)))',
  str(ROOT / 'effects/effects.js')]))
with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CHROME, args=FLAGS)
    for i in ids:
        pg = br.new_page(viewport={'width': 640, 'height': 360})
        pg.goto((ROOT / 'effects/scene.html').as_uri() + f'?render=1&fx={i}')
        pg.wait_for_function('window.seek')
        if i == 'flow':  # 流场需要顺序推进才有轨迹
            for k in range(90): pg.evaluate(f'window.seek({k/30})')
        else:
            pg.evaluate(f'window.seek({ {"dis": 8.6}.get(i, 3)})')
        pg.screenshot(path=str(ROOT / f'effects/thumbs/{i}.jpg'), type='jpeg', quality=85)
        pg.close(); print('thumb', i)
    br.close()
