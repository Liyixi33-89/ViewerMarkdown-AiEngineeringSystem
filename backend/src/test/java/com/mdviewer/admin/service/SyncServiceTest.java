package com.mdviewer.admin.service;

import com.mdviewer.MdViewerApplication;
import com.mdviewer.common.BizException;
import com.mdviewer.domain.mapper.DocNodeMapper;
import com.mdviewer.sync.VersionRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * SyncService 导出/导入：核心验证「按名称路径幂等 upsert」——
 * 同一份导出导入两次，第二次应为 0 新建 0 更新（解决双库 id 分叉同步）。
 */
@SpringBootTest(classes = MdViewerApplication.class)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb2;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.sql.init.mode=always",
        "mdviewer.init.enabled=false"
})
@Transactional
class SyncServiceTest {

    @Autowired
    private SyncService syncService;
    @Autowired
    private NodeService nodeService;
    @Autowired
    private DocNodeMapper nodeMapper;
    @Autowired
    private VersionRegistry versionRegistry;
    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbc;

    @Test
    void exportThenImportTwiceIsIdempotent() throws Exception {
        // 源库建树：/A/B/d.md + /顶层文档.md
        var a = nodeService.create(0L, "A", true, null, 1L);
        var b = nodeService.create(a.getId(), "B", true, null, 1L);
        var d = nodeService.create(b.getId(), "d.md", false, "# hello", 1L);
        var top = nodeService.create(0L, "顶层文档.md", false, "内容", 1L);

        SyncService.ExportPayload payload = syncService.exportAll();
        assertEquals(4, payload.items().size());
        assertTrue(payload.items().stream().anyMatch(i ->
                i.namePath().equals("/A/B/d.md") && "# hello".equals(i.content())));

        // 模拟目标库：清空当前树，再导入（跨库重建）
        jdbc.update("DELETE FROM doc_node");
        SyncService.ImportStats first = syncService.importAll(payload);
        assertEquals(4, first.created());
        assertEquals(0, first.updated());

        // 第二次导入同一份：完全幂等（0 新建 0 更新，含文件夹条目跳过）
        SyncService.ImportStats second = syncService.importAll(payload);
        assertEquals(0, second.created());
        assertEquals(0, second.updated());
        assertEquals(4, second.skipped());

        // 重建后的文档内容与源一致
        var rebuiltD = nodeService.getDoc(
                nodeMapper.selectList(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.mdviewer.domain.entity.DocNode>()
                                .eq(com.mdviewer.domain.entity.DocNode::getName, "d.md"))
                        .get(0).getId());
        assertEquals("# hello", rebuiltD.getContent());
    }

    @Test
    void importUpdatesChangedContentOnly() {
        var a = nodeService.create(0L, "A", true, null, 1L);
        var doc = nodeService.create(a.getId(), "d.md", false, "旧内容", 1L);

        var payload = SyncService.ExportPayload.of(List.of(
                new SyncService.ExportItem("/A/d.md", false, 1, 1, "新内容", null),
                new SyncService.ExportItem("/A/新文档.md", false, 1, 1, "全新", null)));

        SyncService.ImportStats stats = syncService.importAll(payload);
        assertEquals(1, stats.created());
        assertEquals(1, stats.updated());
        assertEquals("新内容", nodeMapper.selectById(doc.getId()).getContent());
        assertNotNull(nodeService.getDoc(
                nodeMapper.selectList(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.mdviewer.domain.entity.DocNode>()
                                .eq(com.mdviewer.domain.entity.DocNode::getName, "新文档.md"))
                        .get(0).getId()).getContent());
    }

    @Test
    void importRejectsWrongVersionAndBadPath() {
        var bad = new SyncService.ExportPayload("unknown/9", 0, List.of());
        assertEquals(4001, assertThrows(BizException.class,
                () -> syncService.importAll(bad)).getCode());

        var badPath = SyncService.ExportPayload.of(List.of(
                new SyncService.ExportItem("no-leading-slash", false, 1, 1, "x", null)));
        assertEquals(4001, assertThrows(BizException.class,
                () -> syncService.importAll(badPath)).getCode());
    }

    @Test
    void importSkipsTypeConflict() {
        nodeService.create(0L, "X", true, null, 1L); // 文件夹 X
        var payload = SyncService.ExportPayload.of(List.of(
                new SyncService.ExportItem("/X", false, 1, 1, "想覆盖成文档", null)));

        SyncService.ImportStats stats = syncService.importAll(payload);
        assertEquals(0, stats.created());
        assertEquals(0, stats.updated());
        assertEquals(1, stats.skipped()); // 类型冲突不覆盖
    }

    @Test
    void importCreatesNestedFoldersOnDemand() {
        // 目标库为空，导入 /P/Q/R.md 应逐级建 P、Q 再建文档，共 3 个节点
        var payload = SyncService.ExportPayload.of(List.of(
                new SyncService.ExportItem("/P/Q/R.md", false, 1, 1, "深路径", null)));
        SyncService.ImportStats stats = syncService.importAll(payload);
        assertEquals(3, stats.created());
        assertEquals(0, stats.skipped());
        assertNotNull(nodeService.getDoc(nodeMapper.selectList(
                        new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.mdviewer.domain.entity.DocNode>()
                                .eq(com.mdviewer.domain.entity.DocNode::getName, "R.md"))
                .get(0).getId()));
    }
}
