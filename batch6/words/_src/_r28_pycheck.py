# -*- coding: utf-8 -*-
"""r28 words Python 独立复算（双侧 verify 的 Python 侧）
按 SPEC-R28-WORDS §R3 生成律在 Python 独立实现 genLevel（mulberry32/shuffled/
nDisEff/家族优先干扰律），与真实页（?verify=1 页内 JS genLevel）提取的 40 关
quizzes JSON 全量比对——两侧逐题一致 = r28 生成律独立验证。
另附：与 r28-baseline.json（改造前）的谱变更对照（保留/变更声明机检）。
用法: python _r28_pycheck.py   （先 _r28_extract.py r28-post.json）"""
import json, math, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
POST = HERE / 'r28-post.json'
BASELINE = HERE / 'r28-baseline.json'
CH_LEN = 5

# ---------- 确定性随机（与 game-core.js mulberry32 逐位同实现，r27 pycheck 先例） ----------
def i32(x):
    x &= 0xFFFFFFFF
    return x - 0x100000000 if x >= 0x80000000 else x

def imul(a, b):
    return i32(a * b)

def mulberry32(seed):
    a = i32(seed)
    def rnd():
        nonlocal a
        a = i32(a + 0x6D2B79F5)
        t = imul(i32(a) ^ i32((a & 0xFFFFFFFF) >> 15), 1 | i32(a))
        t = i32(i32(t + imul(i32(t) ^ i32((t & 0xFFFFFFFF) >> 7), 61 | i32(t))) ^ i32(t))
        return ((i32(t) ^ i32((t & 0xFFFFFFFF) >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return rnd

def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = math.floor(rnd() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a

# ---------- 数据域（SPEC-R28 §R2 独立副本，与 game-data.js 同源誊抄） ----------
CHAPTERS = {1: dict(dPart=2, dPartMax=2, nDis=2),
            2: dict(dPart=2, dPartMax=2, nDis=3),
            3: dict(dPart=3, dPartMax=3, nDis=2),
            4: dict(dPart=2, dPartMax=3, nDis=3)}

CHARS = {
 1: [('明','ming',['日','月']),('林','lin',['木','木']),('双','shuang',['又','又']),
     ('男','nan',['田','力']),('岩','yan',['山','石']),('尘','chen',['小','土']),
     ('尖','jian',['小','大']),('灶','zao',['火','土']),('鲜','xian',['鱼','羊']),
     ('汗','han',['氵','干']),('村','cun',['木','寸']),('看','kan',['手','目'])],
 2: [('晴','qing',['日','青']),('清','qing2',['氵','青']),('请','qing3',['讠','青']),
     ('情','qing4',['忄','青']),('他','ta',['亻','也']),('地','di',['土','也']),
     ('她','ta2',['女','也']),('池','chi2',['氵','也']),('江','jiang',['氵','工']),
     ('红','hong',['纟','工']),('妈','ma',['女','马']),('吗','ma2',['口','马'])],
 3: [('森','sen',['木','木','木']),('晶','jing',['日','日','日']),('品','pin',['口','口','口']),
     ('众','zhong',['人','人','人']),('想','xiang',['木','目','心']),('树','shu',['木','又','寸']),
     ('湖','hu',['氵','古','月']),('唱','chang',['口','日','日']),('意','yi',['立','日','心']),
     ('淡','dan',['氵','火','火']),('落','luo',['艹','氵','各']),('荷','he2',['艹','亻','可'])],
 4: [('纸','zhi',['纟','氏']),('苗','miao',['艹','田']),('松','song',['木','公']),
     ('星','xing',['日','生']),('听','ting',['口','斤']),('叶','ye',['口','十']),
     ('洋','yang',['氵','羊']),('洗','xi',['氵','先']),('草','cao',['艹','早']),
     ('花','hua',['艹','化']),('谢','xie',['讠','身','寸']),('梦','meng',['木','木','夕']),
     ('奶','nai',['女','乃']),('河','he',['氵','可']),('好','hao',['女','子']),
     ('打','da',['扌','丁']),('吃','chi',['口','乞']),('沙','sha',['氵','少']),
     ('拍','pai',['扌','白'])],
}

def ch_of_flat(flat):
    return flat // CH_LEN + 1

def diff_of_ch(ch):
    return (ch - 1) % 4 + 1

def n_dis_eff(dch, lv):                      # SPEC §R3：lv>=2 → max(3, nDis)
    return max(3, CHAPTERS[dch]['nDis']) if lv >= 2 else CHAPTERS[dch]['nDis']

def family_parts(entry, pool):
    shared = set(entry[2])
    seen = set(entry[2])
    cands = []
    for e in pool:
        if e is entry or not any(p in shared for p in e[2]):
            continue
        for p in e[2]:
            if p not in seen:
                seen.add(p)
                cands.append(p)
    return cands

def pick_distractors(dch, lv, entry, pool, rnd):
    n = n_dis_eff(dch, lv)
    fam = shuffled(family_parts(entry, pool), rnd)
    seen = set(entry[2]) | set(fam)
    rest = []
    for e in pool:
        for p in e[2]:
            if p not in seen:
                seen.add(p)
                rest.append(p)
    return fam[:n] + shuffled(rest, rnd)[:max(0, n - len(fam))]

def gen_level(flat):
    flat = max(0, int(flat))
    ch = ch_of_flat(flat)
    dch = diff_of_ch(ch)
    lv = flat % CH_LEN
    rnd = mulberry32(flat * 7919 + 13)
    pool = CHARS[dch]
    start = (flat * CH_LEN) % len(pool)
    quizzes = []
    for qi in range(CH_LEN):
        entry = pool[(start + qi) % len(pool)]
        dis = pick_distractors(dch, lv, entry, pool, rnd)
        tiles = shuffled([{'ch': p, 't': 'p'} for p in entry[2]] +
                         [{'ch': d, 't': 'd'} for d in dis], rnd)
        quizzes.append({'c': entry[0], 'py': entry[1], 'parts': list(entry[2]),
                        'distractors': dis,
                        'tiles': [t['ch'] for t in tiles],
                        'tileTypes': [t['t'] for t in tiles]})
    return {'ch': ch, 'dch': dch, 'lv': lv, 'quizzes': quizzes}

def norm(q):
    return {k: q[k] for k in ('c', 'py', 'parts', 'distractors', 'tiles', 'tileTypes')}

def main():
    post = json.loads(POST.read_text(encoding='utf-8'))
    n_ok, bad = 0, []
    for f in range(40):
        mine = gen_level(f)
        page = post[str(f)]
        if mine['ch'] != page['ch'] or mine['dch'] != page['dch'] or mine['lv'] != page['lv']:
            bad.append((f, 'ch/dch/lv mismatch'))
            continue
        if all(json.dumps(norm(m), sort_keys=True, ensure_ascii=False) ==
               json.dumps(norm(p), sort_keys=True, ensure_ascii=False)
               for m, p in zip(mine['quizzes'], page['quizzes'])):
            n_ok += 1
        else:
            for qi, (m, p) in enumerate(zip(mine['quizzes'], page['quizzes'])):
                if json.dumps(norm(m), sort_keys=True, ensure_ascii=False) != \
                   json.dumps(norm(p), sort_keys=True, ensure_ascii=False):
                    bad.append((f, 'quiz %d %s' % (qi, m['c'])))
                    break
    print('PYCHECK %d/%d levels identical' % (n_ok, 40))
    if bad:
        print('MISMATCH:', bad[:8])
        return 1
    # 附：谱变更机检对照（vs 改造前基线）
    base = json.loads(BASELINE.read_text(encoding='utf-8'))
    seq_same, dis_changed, tiles_changed = [], 0, 0
    for f in range(40):
        b, p = base[str(f)]['quizzes'], post[str(f)]['quizzes']
        if [q['c'] for q in b] == [q['c'] for q in p]:
            seq_same.append(f)
        dis_changed += sum(1 for qb, qp in zip(b, p) if qb['distractors'] != qp['distractors'])
        tiles_changed += sum(1 for qb, qp in zip(b, p) if qb['tiles'] != qp['tiles'])
    print('题字序列不变关: %d/40 %s' % (len(seq_same), seq_same))
    print('distractors 变更题数: %d/200（干扰律全局变更→全谱刷新）' % dis_changed)
    print('tiles 变更题数: %d/200' % tiles_changed)
    kept_q0 = [f for f in range(40)
               if base[str(f)]['quizzes'][0]['c'] == post[str(f)]['quizzes'][0]['c']
               and base[str(f)]['quizzes'][0]['parts'] == post[str(f)]['quizzes'][0]['parts']]
    print('首题 字+部件 逐字保留关: %d/40 %s' % (len(kept_q0), kept_q0))
    return 0

if __name__ == '__main__':
    sys.exit(main())
