#!/usr/bin/env python3
"""重建 catalog.json —— 素材库总索引。新增素材后跑一次：python3 video/build_catalog.py

字段: id, type(effect|scene|prototype|doc), name, name_en, category, tags, used_in, prompt, path, thumb, render, source
"""
import json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
items = []

# 1) 效果库（effects/effects.js 是唯一来源）
fx = json.loads(subprocess.check_output(['node', '-e',
    'global.window={};eval(require("fs").readFileSync(process.argv[1],"utf8"));'
    'console.log(JSON.stringify(window.FXLIB.FX.map(({glsl,...m})=>({...m,kind:glsl?"glsl":"canvas2d"}))))',
    str(ROOT / 'effects/effects.js')]))
CAT = {'form': '形体', 'optics': '光学', 'lines': '结构线', 'atmo': '氛围', 'break': '破坏/维度'}
for f in fx:
    items.append({
        'id': f['id'], 'type': 'effect', 'name': f['nm'], 'name_en': f['en'],
        'category': CAT.get(f['cat'], f['cat']), 'tags': [f['kind']] + f['ds'].split(' + '),
        'used_in': f['use'], 'use_note': f['useTxt'], 'tech': f['tech'], 'prompt': f['prompt'],
        'path': f'effects/scene.html?fx={f["id"]}', 'thumb': f'effects/thumbs/{f["id"]}.jpg',
        'render': f'python3 video/render.py effects/scene.html --q "fx={f["id"]}&dur=10"',
    })

# 2) 视频场景（scenes/<name>/scene.html，每个都暴露 seek(t)）
SCENES = {
    'p2-netbody': dict(name='P2 · 蓝色网光体转台 loop', name_en='Blue net light-body turntable', category='形体',
        used_in=['P2'], tags=['loop 12s', 'SDF', 'voronoi'], based_on=['body', 'net'],
        prompt='SDF raymarched neutral humanoid, voronoi F2-F1 surface net, glowing nodes, fresnel rim glow, moving scanline, slow 360° turntable, seamless loop'),
    'gallery-bubbles': dict(name='画廊 · 珠链虹彩泡泡 loop', name_en='Pearl-chain iridescent bubbles', category='光学',
        used_in=['画廊'], tags=['loop 10s', 'thin-film', '极光冷调', '粉彩高阶'], based_on=['iri'],
        prompt='pearl-chain soap bubbles along an S-curve, thin-film interference (n=1.33), aurora-cold + pastel palettes, big-small pearl rhythm, faint regular hex foam, dark bg, seamless loop'),
}
for sid, m in SCENES.items():
    items.append({'id': sid, 'type': 'scene', **m, 'path': f'scenes/{sid}/scene.html', 'thumb': f'scenes/{sid}/thumb.jpg',
                  'render': f'python3 video/render.py scenes/{sid}/scene.html'})

# 3) 网页原型（从 claude.ai Artifact 归档，2026-11-20）
PROTOS = [
    ('optical-effect-library', '光学渲染效果库（22 效果总览）', 'https://claude.ai/artifact/1Fo39v7VDqdxmZ6c5LzMRp', ['P1', 'P2'], '效果数据已抽到 effects/effects.js，这里保留原始页面'),
    ('bubble-gallery', 'Awakenology 泡泡画廊', 'https://claude.ai/artifact/3a6ndi4bgkUm17Kj7ZxX17', ['画廊'], '曲线画廊泡泡版：珠链 + 规则泡沫，极光冷调 / 粉彩高阶'),
    ('curve-gallery-effects', '曲线画廊 · 效果库', 'https://claude.ai/artifact/HgF2Vi2KeaYovhXZEvuSnT', ['画廊'], '沿数学曲线排列的效果画廊（Curve Gallery 原理）'),
    ('optical-gallery-m0', '光学画廊 M0', 'https://claude.ai/artifact/N9TZaBEhAdF2y7SixULXbz', ['画廊'], '《摧毀只是一瞬間》原型：场景全部由数学公式生成'),
    ('layer01-blue-netbody', '第1靈體 · 藍色網光體（v12 转台播放器）', 'https://claude.ai/artifact/W6oEegwYzStiAx4yGg1wGR', ['P2'], '72 帧 Blender 预渲染转台；拖拽旋转'),
    ('prologue-keyframes', '序言样片 关键帧', 'https://claude.ai/artifact/8YVwcTsmgq79ycfJRgDBkW', ['序言'], '地球弧光贯穿四镜；5 张 1080p 关键帧'),
    ('destruction-prototype01-a', '摧毀只是一瞬間 · Prototype 01（A）', 'https://claude.ai/artifact/Ud9JQbxAD3QcyUGSzerz6L', ['P1'], '一个连续展厅 + 三个占位装置；Explore → Focus → Cinematic → Inspect → Transition 相机流程'),
    ('destruction-prototype01-b', '摧毀只是一瞬間 · Prototype 01（B）', 'https://claude.ai/artifact/LFQutU5JQarLqGGj9SMvPH', ['P1'], '同名另一版（2026-11-05 更新）'),
]
for pid, name, url, used, note in PROTOS:
    items.append({'id': pid, 'type': 'prototype', 'name': name, 'used_in': used, 'use_note': note,
                  'path': f'prototypes/{pid}/index.html', 'source': url,
                  **({'thumb': f'prototypes/{pid}/thumb.jpg'} if (ROOT / f'prototypes/{pid}/thumb.jpg').exists() else {})})

# 4) 文档
items.append({'id': 'thought-forms-chapters', 'type': 'doc', 'name': 'Thought-Forms 章节整理（1905）', 'used_in': ['Thought-Forms'],
              'use_note': '22 章导读 + 25 色表色号 + 每章 3D 方向（对应效果代号）', 'path': 'docs/thought-forms-chapters.md',
              'source': 'https://claude.ai/artifact/Woz4HmcRuEFjPd9TdLL4uo'})

out = {'version': 1, 'updated': '2026-11-20', 'count': len(items), 'items': items}
(ROOT / 'catalog.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
print('catalog.json', len(items), 'items')
