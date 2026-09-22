---
name: linux-deploy-static
description: Linux 服务器部署前端静态资源 + Spring Boot 的坑位清单。适用场景：scp/rsync 上传后 403、nginx 静态文件 Forbidden、systemd 托管 jar、云服务器端口不通排查、H2 文件库搬迁。检索关键词：403 Forbidden、scp 权限丢失、nginx 无权读取、安全组放行、systemd 部署、腾讯云端口不通、H2 数据库同步。
---

# Linux 静态部署 + Spring Boot 上线（坑位清单）

## 环境基线（2026-09-20 部署案例）

- 目标机：腾讯云 OpenCloudOS 9.4（RHEL 系），4C/3.6G/40G，已有 nginx（注意 conf.d 里可能有旧站点占 80）
- 部署布局：`/opt/mdviewer/{md-viewer-server.jar, frontend/, data/, md-viewer.env}`
- 后端 systemd：`/etc/systemd/system/md-viewer.service`，`EnvironmentFile` 注入 JWT secret
- nginx 站点：`/etc/nginx/conf.d/md-viewer.conf`，listen 8081（80 被旧项目 taskmanager 占用）

## 坑位（按出现频率）

1. **scp 从 Windows 传目录权限丢失 → nginx 403**
   - 症状：`index.html` 200 但 `/assets/*` 全部 403
   - 根因：scp -r 传入的目录变成 `drwx------`（700），nginx worker 用户读不了
   - 修复：`chmod -R a+rX <前端根目录>`
   - 预防：每次上传 dist 后必跑 chmod；写进部署脚本

2. **多层转义毁掉远程命令 → 配置文件损坏**
   - 症状：通过 `ssh "cat > file << 'EOF'"` 写 nginx 配置，`$uri` 被 PowerShell/ssh 双层转义吃掉
   - 规则：**配置文件一律本地写好 → scp 上传**，绝不在 ssh 内联 heredoc 写含 `$` 的内容
   - （与 transcribe-key 一致：长内容/含特殊字符内容不经过 LLM 或多层 shell 复述）

3. **公网端口不通但本机 curl 通 → 云安全组**
   - iptables ACCEPT、服务器内 127.0.0.1:8081 通，公网超时 = 腾讯云安全组未放行
   - 控制台 → 实例 → 安全组 → 入站规则放行对应 TCP 端口

4. **80 端口已被旧项目占用**
   - 部署前先 `grep -rl 'listen 80' /etc/nginx/conf.d/` + `ss -tlnp | grep :80`
   - 有冲突就换端口或用域名 + server_name 区分，别覆盖别人配置

5. **SSH 加固后验证顺序**
   - 关密码登录前先确认密钥登录可用；改完 `sshd -t` 语法检查再 reload
   - reload 瞬间连接可能被拒，隔几秒重试一次再下「锁死」结论
   - 加固文件：`/etc/ssh/sshd_config.d/99-hardening.conf`（PasswordAuthentication no）

6. **JWT secret 不进代码库**
   - 本地随机生成 → scp 到服务器 `EnvironmentFile`（600 权限）
   - systemd unit 里只引用文件路径，secret 永不出现在命令行历史

7. **H2 文件库搬迁必须停机窗口操作**
   - 线上 H2 运行中持有文件锁：热覆盖 mv.db 必损坏 → 重启后 H2 重建空库，
     `init.enabled=true` 还会插入示例数据，看似「成功」实则数据全丢
   - 本地上传前确认进程死透：残留 java 进程锁文件 → scp 读出 0 字节（`Domain error`），
     上传的是空文件。用 `netstat -ano | findstr :8090` + `Get-Process java` 双查
   - 正确顺序：**停线上 → rm 旧库 → scp → 启动**，传完核对文件字节数再启动
   - 被锁时可复制副本绕开：`Copy-Item` 到 %TEMP% 再传（进程停掉后副本是完整的）

8. **sshd_config.d 覆盖规则：文件名排序，首个值生效**
   - 写 `99-hardening.conf` 会被 `50-cloud-init.conf`（PasswordAuthentication yes）抢先，
     加固静默失效——`sshd -T | grep passwordauthentication` 必查实际生效值
   - 加固文件命名 `00-hardening.conf` 保证最先加载
   - reload 后密钥登录立即验证；瞬时拒绝隔几秒重试再下结论

9. **PowerShell → ssh → bash 多层转义必炸 JSON/sh 命令**
   - 症状：远端收到 `Unrecognized character escape`、JSON parse error、token 解析出 1 字符
   - 规则：**含引号/`$`/JSON 的远端命令一律本地写 .sh 或 .json 文件 → scp 上传 → 远端执行**
   - 取 JSON 字段别用 grep 切（JWT 含转义符会截断），用 `python3 -c 'import json,sys; ...'`

10. **应用层安全加固清单（2026-09-21 落地）**
    - 改密码接口：旧密码校验 + 新密码 ≥8 位 + 改完强制重登
    - 登录失败限流：单机内存版 LoginGuard，5 次锁 10 分钟（连错第 5 次起返回 4015）
    - 后端只绑 `--server.address=127.0.0.1`（systemd ExecStart 追加参数），公网只可达 nginx
    - 默认密码上线后立即通过接口改掉，新密码不进代码库/命令行历史

11. **H2 整库文件同步 = 物理覆盖，会冲掉线上独有状态（2026-09-21 事故）**
    - 症状：线上 `/admin/auth/login` 返回 4012「用户名或密码错误」，
      但文档内容一切正常
    - 根因：为同步文档内容执行了「本地 mv.db → scp 覆盖线上」的整库搬迁，
      `admin_user` 表被本地库覆盖 → 线上改过的密码回退成本地的 admin123
      （文件级同步对「线上比本地新」的数据是毁灭性的）
    - 判定手法：用本地密码试探线上登录（成功即实锤）；
      `journalctl -u md-viewer` 看失败登录只有 SELECT 无 UPDATE last_login_at
    - 铁律：**线上内容更新一律走 API（POST /admin/nodes/doc、PUT .../content），
      只动内容表；整库搬迁仅限首次迁移或架构级变更，且必须先评估线上独有状态
      （密码、会话、在线数据）是否会被覆盖**
    - 统一入口：`upload_doc.py <md文件> <文档名> [--target prod|local]`，
      默认 target=prod 直接写线上；密码按环境自动区分，不进命令行历史
    - 改密接口真实路径是 `POST /admin/auth/change-password`（带 oldPassword + cookie），
      记错路径会得到误导性的 500 NoResourceFoundException

12. **新接口上线后旧 jar 兜底 500：路由变量误匹配（2026-09-22 事故）**
    - 症状：本地前端调 `PUT /api/admin/nodes/order` 返回 500 `{"code":5000,"msg":"服务内部错误"}`，
      后端代码明明已写好该接口
    - 根因：**运行中的后端是改动前启动的旧 jar**。新路由 `/nodes/order` 不存在于旧代码，
      被 `@PutMapping("/nodes/{id}/move")` 的路径变量当成 `id="order"`，`"order"` 转 Long 失败
      → 全局异常处理器兜底 500（而非预期的 404）
    - 判定手法：`Get-CimInstance Win32_Process -Filter "ProcessId=<pid>"` 查进程启动时间，
      与代码提交时间对比；启动时间早于代码改动 = 跑的是旧版
    - 铁律：**新增接口后必须重启后端进程再联调**；报 500 先查「进程是不是旧的」再查代码。
      Windows 下 jar 被运行进程锁定，`mvn package` 会报 `Unable to rename ... .jar.original`——
      先 Stop-Process 再打包
    - 后台启动用 `Start-Process -WindowStyle Hidden`（重定向 stdout 到日志文件）；
      `execute_command` 的 background 模式会随 shell 退出被杀，端口起不来别急着怪代码

13. **树操作接口的校验矩阵陷阱：完整性校验 vs 跨目录拖入（2026-09-22，fa360bc）**
    - 症状：拖拽排序接口报 4041「节点 32 不在目标目录下」，但跨目录拖入本应是支持的功能
    - 根因：reorder 的「列表完整性校验」（目标目录现有子节点必须全在 orderedIds 里）
      写反了方向——把**合法的外来拖入节点**也要求「已在目标目录下」，自相矛盾
    - 教训：涉及「校验集合」的接口设计，先列全场景矩阵再写校验：
      同目录纯排序 / 跨目录拖入（外来节点 1 个）/ 拖入缺失现有节点（拒绝）/ 幂等重放（放行）
    - 修复模式：外来节点放行但限 1 个且须 mustExist；环检测/层级校验继续复用 move 兜底
    - **同名缺口同日补齐**：跨目录 move 时目标目录已有同名 → uniqueName 自动加 `(n)`；
      创建/重命名/上传原有去重，唯独 move 漏了——「同一去重规则要覆盖所有变更 parentId 的入口」


## 部署快捷序列（复用模板）

```bash
# 本地：构建
mvn clean package -DskipTests && cd ../frontend && npx vite build
# 上传
scp backend/target/*.jar root@IP:/opt/mdviewer/md-viewer-server.jar
ssh root@IP "rm -rf /opt/mdviewer/frontend/*"
scp -r frontend/dist/* root@IP:/opt/mdviewer/frontend/
# 服务器：权限 + 重启（配置见上方基线）
ssh root@IP "chmod -R a+rX /opt/mdviewer/frontend && systemctl restart md-viewer && nginx -t && systemctl reload nginx"
```

## 数据同步决策（2026-09-21 新增）

```text
要同步什么？            → 手段
─────────────────────────────────────────────────────
文档内容的新增/修改      → admin API（upload_doc.py --target prod）
线上文档拉回本地         → portal API 拉全文 + 本地 admin API 创建（双向都走 API）
前端静态资源            → scp dist + chmod（见部署序列）
后端 jar               → scp + systemctl restart
整库初始化/架构迁移      → 停机窗口整库搬迁（先备份线上库！）
                       → mv /opt/mdviewer/data/md_viewer.mv.db{,.bak}
```

## 后端 jar 发布序列（2026-09-22 固化，全程不碰 data/）

```bash
# 1. 打包前先停本地后端（Windows jar 锁）
Stop-Process -Id <本地8090进程PID> -Force
mvn package -q -DskipTests
# 2. 上传为临时名 → 核对字节数一致 → 原子替换（旧 jar 自动保留 .bak）
scp target/md-viewer-server-*.jar root@IP:/opt/mdviewer/md-viewer-server.jar.new
ssh root@IP "ls -l /opt/mdviewer/md-viewer-server.jar.new"   # 对照本地字节数
ssh root@IP "mv /opt/mdviewer/md-viewer-server.jar.new /opt/mdviewer/md-viewer-server.jar \
             && systemctl restart md-viewer && sleep 12 && systemctl is-active md-viewer \
             && curl -s http://127.0.0.1:8090/api/portal/version | head -c 60"
# 3. 公网验证：登录 → 幂等重放新接口（原样重放现有顺序，零副作用验证路由通）
```
