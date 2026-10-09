#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
clip=$1
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$clip")
status=0
for pct in 10 50 90; do
  t=$(awk -v d="$dur" -v p="$pct" 'BEGIN { printf "%.2f", d * p / 100 }')
  for edge in right bottom; do
    [ "$edge" = right ] && crop="format=gray,crop=1:ih:iw-1:0" || crop="format=gray,crop=iw:1:0:ih-1"
    vals=$(ffmpeg -v error -ss "$t" -i "$clip" -frames:v 1 -vf "$crop" -f rawvideo -pix_fmt gray - \
      | od -An -v -tu1 | tr -s ' ' '\n' | grep -v '^$' | sort -n | uniq || true)
    if [ -z "$vals" ]; then echo "FAIL ${pct}% $edge: no frame decoded"; status=1; continue; fi
    lo=$(echo "$vals" | head -1); hi=$(echo "$vals" | tail -1)
    # Gray padding encodes to 126-130; black bars to 0. The app's dark canvas reads 13.
    if { [ "$lo" -ge 120 ] && [ "$hi" -le 136 ]; } || [ "$hi" -le 5 ]; then
      echo "FAIL ${pct}% $edge: filler (values $lo-$hi)"; status=1
    else
      echo "ok   ${pct}% $edge: values $lo-$hi"
    fi
  done
done
exit $status
