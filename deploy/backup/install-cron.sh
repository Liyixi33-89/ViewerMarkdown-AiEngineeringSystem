#!/usr/bin/env bash
# 幂等安装备份 cron：保留现有条目（如 qcloud stargate），仅追加/替换 mdv-backup 行
set -euo pipefail
LINE='30 3 * * * /opt/mdviewer/bin/mdv-backup.sh >/dev/null 2>&1'
{ crontab -l 2>/dev/null | grep -v 'mdv-backup.sh' || true; echo "$LINE"; } | crontab -
crontab -l
# 备份可恢复性校验：gzip 完整性 + 解压后 H2 文件头
LATEST=$(ls -t /opt/mdviewer/backup/md_viewer-*.mv.db.gz | head -1)
gzip -t "$LATEST" && echo "gzip ok: $LATEST"
echo "header: $(zcat "$LATEST" | head -c 3)"
