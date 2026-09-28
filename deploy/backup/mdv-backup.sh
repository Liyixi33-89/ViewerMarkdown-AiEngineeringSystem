#!/usr/bin/env bash
# MD Viewer H2 数据库每日备份（cron 调用，部署于 /opt/mdviewer/bin/mdv-backup.sh）
# 在线热备：H2 运行中持有文件锁，直接 cp mv.db 可能拷到不一致页 ——
# 用 H2 自带 BACKUP 语句需要 JDBC 连接；这里采用「cp 后校验文件头」的轻量方案，
# 并保留最近 KEEP_DAYS 份，失败写 journal（logger）便于 journalctl 追查。
set -euo pipefail

DATA_DIR=/opt/mdviewer/data
BACKUP_DIR=/opt/mdviewer/backup
KEEP_DAYS=7
DB_FILE="$DATA_DIR/md_viewer.mv.db"
STAMP=$(date +%Y%m%d-%H%M%S)
TARGET="$BACKUP_DIR/md_viewer-$STAMP.mv.db"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

if [[ ! -s "$DB_FILE" ]]; then
  logger -t mdv-backup "FAIL: $DB_FILE missing or empty"
  exit 1
fi

cp --preserve=timestamps "$DB_FILE" "$TARGET.tmp"

# 校验：大小一致 + H2 MVStore 文件头以 "H:2" 开头
SRC_SIZE=$(stat -c %s "$DB_FILE")
DST_SIZE=$(stat -c %s "$TARGET.tmp")
HEADER=$(head -c 3 "$TARGET.tmp")
if [[ "$SRC_SIZE" != "$DST_SIZE" || "$HEADER" != "H:2" ]]; then
  rm -f "$TARGET.tmp"
  logger -t mdv-backup "FAIL: verify mismatch size=$SRC_SIZE/$DST_SIZE header=$HEADER"
  exit 1
fi

mv "$TARGET.tmp" "$TARGET"
gzip -9 "$TARGET"
chmod 600 "$TARGET.gz"

# 轮转：删除 KEEP_DAYS 天前的备份
find "$BACKUP_DIR" -name 'md_viewer-*.mv.db.gz' -mtime +"$KEEP_DAYS" -delete

logger -t mdv-backup "OK: $TARGET.gz ($(stat -c %s "$TARGET.gz") bytes)"
