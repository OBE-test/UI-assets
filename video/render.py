#!/usr/bin/env python3
"""Awakenology 代码素材生成库 · 渲染器

用法:
  python3 render.py scenes/p2-netbody/scene.html                  # 按 scene 自带时长/fps 渲 MP4
  python3 render.py scenes/x/scene.html --stills 0.2,0.5,0.8      # 只出 3 张关键帧 PNG（定风格用）
  python3 render.py scenes/x/scene.html --draft                   # 960x540 @15fps 快速草稿
  python3 render.py scenes/x/scene.html --w 3840 --h 2160         # 4K
  python3 render.py scenes/x/scene.html --webm                    # 额外输出 VP9 WebM（网页 <video> 背景用）
  python3 render.py effects/scene.html --q "fx=neb&dur=8"         # 效果库里任一效果 → 视频

原理: 打开 scene.html?render=1 → 对每一帧 await window.seek(t) → 截图 → 管道喂给 ffmpeg。
"""
import argparse, json, subprocess, sys, time, os
from pathlib import Path
from playwright.sync_api import sync_playwright

CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
FLAGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--ignore-gpu-blocklist', '--disable-web-security', '--allow-file-access-from-files']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('scene')
    ap.add_argument('--out', default=None)
    ap.add_argument('--w', type=int); ap.add_argument('--h', type=int)
    ap.add_argument('--fps', type=float); ap.add_argument('--duration', type=float)
    ap.add_argument('--start', type=float, default=0.0)
    ap.add_argument('--stills', default=None, help='逗号分隔的秒数，或 0..1 比例（加 %% 后缀不需要，<=1 视为比例）')
    ap.add_argument('--draft', action='store_true')
    ap.add_argument('--webm', action='store_true')
    ap.add_argument('--crf', type=int, default=18)
    ap.add_argument('--q', default='', help='传给 scene 的 URL 参数，如 fx=net&dur=8')
    ap.add_argument('--name', default=None, help='输出文件名前缀')
    a = ap.parse_args()

    scene = Path(a.scene).resolve()
    outdir = Path(a.out) if a.out else Path(__file__).resolve().parent.parent / 'out'
    outdir.mkdir(parents=True, exist_ok=True)
    from urllib.parse import parse_qs
    qs = parse_qs(a.q)
    name = a.name or (scene.parent.name + ('-' + qs['fx'][0] if 'fx' in qs else ''))

    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, args=FLAGS)
        pg = br.new_page()
        pg.on('console', lambda m: print('[page]', m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: print('[pageerror]', e, file=sys.stderr))
        pg.goto(scene.as_uri() + '?render=1' + ('&' + a.q if a.q else ''))
        pg.wait_for_function('window.__scene && window.seek')
        meta = pg.evaluate('window.__scene')
        W = a.w or (meta['width'] // 2 if a.draft else meta['width'])
        H = a.h or (meta['height'] // 2 if a.draft else meta['height'])
        fps = a.fps or (15 if a.draft else meta['fps'])
        dur = a.duration or meta['duration']
        pg.set_viewport_size({'width': W, 'height': H})
        pg.evaluate('document.fonts.ready')
        pg.evaluate('window.dispatchEvent(new Event("resize"))')

        if a.stills:
            for s in a.stills.split(','):
                v = float(s); t = v * dur if v <= 1 else v
                pg.evaluate(f'window.seek({t})')
                f = outdir / f'{name}_still_{t:06.2f}s.png'
                pg.screenshot(path=str(f)); print('still', f)
            br.close(); return

        suffix = '_draft' if a.draft else ''
        mp4 = outdir / f'{name}{suffix}.mp4'
        cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(fps), '-i', '-',
               '-c:v', 'libx264', '-preset', 'veryfast', '-crf', str(a.crf), '-pix_fmt', 'yuv420p',
               '-movflags', '+faststart', str(mp4)]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        n = int(round(dur * fps)); t0 = time.time()
        for i in range(n):
            t = a.start + i / fps
            pg.evaluate(f'window.seek({t})')
            ff.stdin.write(pg.screenshot(type='jpeg', quality=95))
            if i % max(1, n // 10) == 0:
                el = time.time() - t0
                print(f'  frame {i}/{n}  {el:.0f}s elapsed, ~{el / (i + 1) * (n - i - 1):.0f}s left', flush=True)
        ff.stdin.close(); ff.wait(); br.close()
        print('mp4', mp4)
        if a.webm:
            webm = mp4.with_suffix('.webm')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp4), '-c:v', 'libvpx-vp9', '-b:v', '0',
                            '-crf', '32', '-row-mt', '1', str(webm)], check=True)
            print('webm', webm)


if __name__ == '__main__':
    main()
