package com.mdviewer.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.mdviewer.domain.entity.AdminUser;
import com.mdviewer.domain.entity.DocNode;
import com.mdviewer.domain.mapper.AdminUserMapper;
import com.mdviewer.domain.mapper.DocNodeMapper;

import java.time.LocalDateTime;

/**
 * 启动初始化：默认管理员 + 示例文档（仅本地开发演示用；生产可 mdviewer.init.enabled=false）。
 */
@Configuration
public class InitConfig {

    @Bean
    public CommandLineRunner initData(AdminUserMapper userMapper, DocNodeMapper nodeMapper,
                                      BCryptPasswordEncoder encoder,
                                      @org.springframework.beans.factory.annotation.Value("${mdviewer.init.enabled:true}") boolean enabled,
                                      @org.springframework.beans.factory.annotation.Value("${mdviewer.init.admin-username:admin}") String username,
                                      @org.springframework.beans.factory.annotation.Value("${mdviewer.init.admin-password:admin123}") String password) {
        return args -> {
            if (!enabled) return;

            // 默认管理员
            Long userCount = userMapper.selectCount(null);
            if (userCount == 0) {
                AdminUser admin = new AdminUser();
                admin.setUsername(username);
                admin.setPasswordHash(encoder.encode(password));
                admin.setRole(AdminUser.ROLE_SUPER_ADMIN);
                admin.setLastLoginAt(LocalDateTime.now());
                userMapper.insert(admin);
            }

            // 示例文档（仅空库时）
            Long nodeCount = nodeMapper.selectCount(null);
            if (nodeCount == 0) {
                DocNode folder = new DocNode();
                folder.setParentId(0L);
                folder.setName("使用指南");
                folder.setType(DocNode.TYPE_FOLDER);
                folder.setStatus(DocNode.STATUS_PUBLISHED);
                folder.setSortOrder(0);
                folder.setPath("/");
                nodeMapper.insert(folder);
                folder.setPath("/" + folder.getId() + "/");
                nodeMapper.updateById(folder);

                DocNode doc = new DocNode();
                doc.setParentId(folder.getId());
                doc.setName("欢迎阅读");
                doc.setType(DocNode.TYPE_DOC);
                doc.setStatus(DocNode.STATUS_PUBLISHED);
                doc.setSortOrder(0);
                doc.setPath(folder.getPath());
                doc.setContent("""
                        # 欢迎使用 MD Viewer

                        这是一个 **Markdown 文档预览门户**：左侧为目录树，右侧为渲染回显区。

                        ## 功能速览

                        - 支持标准 **GFM** 语法：表格、任务列表、删除线
                        - 代码块语法高亮与一键复制
                        - 移动端与 PC 端自适应

                        ## 代码示例

                        ```ts
                        const greeting = (name: string): string => `Hello, \\${name}!`;
                        console.log(greeting('MD Viewer'));
                        ```

                        ## 表格示例

                        | 模块 | 说明 |
                        | --- | --- |
                        | 前台 | 只读预览门户 |
                        | 后台 | 文档管理中心 |

                        > 管理员请访问 `/admin` 登录后上传文档。
                        """);
                nodeMapper.insert(doc);
                doc.setPath(folder.getPath() + doc.getId() + "/");
                nodeMapper.updateById(doc);
            }
        };
    }
}
