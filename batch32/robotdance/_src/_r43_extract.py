# -*- coding: utf-8 -*-
"""robotdance r43 谱投影工具：从 index.html 提取 40 关谱（引擎级确定性对拍口径）。
投影字段（每题）：kind('seq'|'fix')/steps/blocks(anim 序)/dch/n/u(不同动作数)/
dup(重复步数=n-u)/dis(干扰数)/fix 位（k/bad，fix 题）。
关级：flat/dch/题步数序列。
用法: python batch32/robotdance/_src/_r43_extract.py [--out out.json]
默认从已 build 的 index.html 提取（node 执行页内 genLevel——无 DOM 依赖段）。"""
import io, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent
IDX = ROOT.parent / 'index.html'

def extract_from(html_text, n_levels=40):
    """从 index.html 切出 data+engine 两段，node 里跑 genLevel 投影（默认 40 关；
    r43 修复轮 minor6：pycheck 传 60——dch4 样本翻倍换分布复验）"""
    m = re.search(r'<script>\n(/\* ================= robotdance .*?)\n</script>\n</body>',
                  html_text, re.S)
    if not m:
        raise SystemExit('index.html 未找到游戏 script 段')
    body = m.group(1)
    cut = body.find('/* ================= robotdance 主逻辑')   # 只取 data+engine 段
    if cut > 0:
        body = body[:cut]
    js = body + ('''
const out = [];
for (let flat = 0; flat < %d; flat++) {''' % n_levels) + r'''
  const L = genLevel(flat);
  const rows = L.quizzes.map(q => {
    const u = new Set(q.steps).size;
    const anims = q.blocks.map(b => b.anim);
    const dis = anims.filter(a => q.steps.indexOf(a) < 0).length;
    const r = { kind: q.kind || 'seq', steps: q.steps, anims: anims,
                n: q.steps.length, u: u, dup: q.steps.length - u, dis: dis };
    if (q.kind === 'fix') { r.k = q.k; r.bad = q.bad; r.disp = q.disp; }
    return r;
  });
  out.push({ flat: flat, dch: L.dch, q: rows });
}
console.log('__SPECTRA__' + JSON.stringify(out));
'''
    tmp = ROOT / '_r43_extract.tmp.js'
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
    if '--out' in sys.argv:
        out_path = pathlib.Path(sys.argv[sys.argv.index('--out') + 1])
    spectra = extract_from(IDX.read_text(encoding='utf-8'))
    # 摘要统计
    n_by_dch, dis_by_dch, dup_by_dch, fix_k_hist = {}, {}, {}, {}
    for L in spectra:
        n_by_dch.setdefault(L['dch'], []).extend(q['n'] for q in L['q'])
        dis_by_dch.setdefault(L['dch'], []).extend(q['dis'] for q in L['q'])
        dup_by_dch.setdefault(L['dch'], []).extend(q['dup'] for q in L['q'])
        for q in L['q']:
            if q['kind'] == 'fix':
                fix_k_hist[q['k']] = fix_k_hist.get(q['k'], 0) + 1
    summ = {}
    for d in sorted(n_by_dch):
        ns = n_by_dch[d]
        summ['dch%d' % d] = {
            'levels': sum(1 for L in spectra if L['dch'] == d),
            'n_min': min(ns), 'n_max': max(ns),
            'dis_min': min(dis_by_dch[d]), 'dis_max': max(dis_by_dch[d]),
            'dup_min': min(dup_by_dch[d]), 'dup_max': max(dup_by_dch[d]),
        }
    result = {'spectra': spectra, 'summary': summ,
              'fix_k_hist': fix_k_hist, 'n_q': sum(len(L['q']) for L in spectra)}
    text = json.dumps(result, ensure_ascii=False, indent=1)
    if out_path:
        out_path.write_text(text, encoding='utf-8')
        print('written:', out_path)
    else:
        print(text)
    print('summary:', json.dumps(summ, ensure_ascii=False))
    print('fix_k_hist:', json.dumps(fix_k_hist, ensure_ascii=False))

if __name__ == '__main__':
    main()
