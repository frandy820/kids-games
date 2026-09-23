# -*- coding: utf-8 -*-
"""quickcmp r46 谱投影工具：从 index.html 提取 40 关谱（引擎级确定性对拍口径）。
投影字段（每题）：kind('cmp'|'dual')/nL/nR/d(dual 差值档)/phase(初始 0)/optsN/flash/
pL/pR（圆点坐标 toFixed(2) 字符串数组——布点对账）。关级：flat/ch/dch。
用法: python batch36/quickcmp/_src/_r46_extract.py [--out out.json] [n_levels]
默认从已 build 的 index.html 提取（node 执行页内 genLevel——无 DOM 依赖段）。"""
import io, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent
IDX = ROOT.parent / 'index.html'

def extract_from(html_text, n_levels=40):
    """从 index.html 切出 data+engine 两段，node 里跑 genLevel 投影（默认 40 关）。"""
    m = re.search(r'<script>\n(/\* ================= quickcmp .*?)\n</script>\n</body>',
                  html_text, re.S)
    if not m:
        raise SystemExit('index.html 未找到游戏 script 段')
    body = m.group(1)
    cut = body.find('/* ================= quickcmp 主逻辑')   # 只取 data+engine 段
    if cut > 0:
        body = body[:cut]
    js = body + ('\nconst out = [];\nfor (let flat = 0; flat < %d; flat++) {' % n_levels) + r'''
  const L = genLevel(flat);
  const rows = L.quizzes.map(q => {
    const r = { kind: q.kind || 'cmp', nL: q.nL, nR: q.nR, optsN: q.optsN, flash: q.flash,
                pL: q.pL.map(p => p.map(v => v.toFixed(2))),
                pR: q.pR.map(p => p.map(v => v.toFixed(2))) };
    if (q.kind === 'dual') { r.d = q.d; r.phase = q._phase; }
    return r;
  });
  out.push({ flat: flat, ch: L.ch, dch: L.dch, q: rows });
}
console.log('__SPECTRA__' + JSON.stringify(out));
'''
    tmp = ROOT / '_r46_extract.tmp.js'
    tmp.write_text(js, encoding='utf-8')
    try:
        p = subprocess.run(['node', str(tmp)], capture_output=True, text=True,
                           encoding='utf-8', timeout=60)
    finally:
        tmp.unlink(missing_ok=True)
    if p.returncode != 0:
        raise SystemExit('node 提取失败: ' + p.stderr[:500])
    for line in p.stdout.splitlines():
        if line.startswith('__SPECTRA__'):
            return json.loads(line[len('__SPECTRA__'):])
    raise SystemExit('node 输出无 __SPECTRA__: ' + p.stdout[:300])

def main():
    out_path = None
    n_levels = 40
    if '--out' in sys.argv:
        out_path = pathlib.Path(sys.argv[sys.argv.index('--out') + 1])
    for a in sys.argv[1:]:
        if a.isdigit():
            n_levels = int(a)
    spectra = extract_from(IDX.read_text(encoding='utf-8'), n_levels)
    # 摘要统计（比例带/等数/dual 档分布——改造面速览）
    eq_by_dch, dual_d, r_lo, r_hi = {}, {}, [], []
    for L in spectra:
        for q in L['q']:
            same = q['nL'] == q['nR']
            k = '%d%s' % (L['dch'], 'eq' if same else 'ne')
            eq_by_dch[k] = eq_by_dch.get(k, 0) + 1
            if q['kind'] == 'dual':
                dual_d[q['d']] = dual_d.get(q['d'], 0) + 1
            if not same:
                r = min(q['nL'], q['nR']) / max(q['nL'], q['nR'])
                r_lo.append(round(r, 4)); r_hi.append(round(r, 4))
    summ = {'n_levels': len(spectra),
            'n_q': sum(len(L['q']) for L in spectra),
            'eq_ne_by_dch': eq_by_dch,
            'dual_d_hist': dual_d,
            'ratio_min': min(r_lo) if r_lo else None,
            'ratio_max': max(r_hi) if r_hi else None}
    result = {'spectra': spectra, 'summary': summ}
    text = json.dumps(result, ensure_ascii=False, indent=1)
    if out_path:
        out_path.write_text(text, encoding='utf-8')
        print('written:', out_path)
    print('summary:', json.dumps(summ, ensure_ascii=False))

if __name__ == '__main__':
    main()
