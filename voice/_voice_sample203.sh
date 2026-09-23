#!/bin/bash
# 203 CosyVoice 音色样本：女声一号(clone) + 女声二号(instruct 嗲甜) × 5 游戏句
cd /data/tts_upgrade2
PY=/data/miniconda3/envs/asr/bin/python
OUT=/tmp/voice_samples
mkdir -p $OUT
declare -A LINES=(
  [tut]='看！昆虫和蜘蛛'
  [right]='答对啦，小科学家'
  [sel]='玩具摔坏了，你也会更难过'
  [sci]='昆虫有六条腿，头胸腹三部分'
  [q]='蚂蚁呀，它是昆虫还是蜘蛛'
)
for v in 女声一号 女声二号; do
  case $v in 女声一号) tag=cv1_clone;; *) tag=cv2_instruct;; esac
  for k in tut right sel sci q; do
    $PY cv2_server2.py synth --voice "$v" --text "${LINES[$k]}" --out "$OUT/${tag}_${k}.wav" >/dev/null 2>&1
    [ -s "$OUT/${tag}_${k}.wav" ] && echo "ok ${tag}_${k}.wav" || echo "FAIL ${tag}_${k}.wav"
  done
done
ls -la $OUT/ | tail -12
