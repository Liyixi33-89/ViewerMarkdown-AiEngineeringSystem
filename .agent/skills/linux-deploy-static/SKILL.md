---
name: linux-deploy-static
description: Linux 服务器部署前端静态资源 + Spring Boot 的坑位清单。适用场景：scp/rsync 上传后 403、nginx 静态文件 Forbidden、systemd 托管 jar、云服务器端口不通排查。检索关键词：403 Forbidden、scp 权限丢失、nginx 无权读取、安全组放行、systemd 部署、腾讯云端口不通。
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
