package com.mdviewer.admin.service;

import com.mdviewer.MdViewerApplication;
import com.mdviewer.common.BizException;
import com.mdviewer.domain.entity.DocNode;
import com.mdviewer.domain.mapper.DocNodeMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * NodeService 树操作集成测试：真 H2 内存库 + 事务回滚（每次测试数据隔离）。
 * 覆盖历史上出过 bug 的路径：reorder 完整性校验、跨目录拖入、环检测、层级上限、回收站。
 */
@SpringBootTest(classes = MdViewerApplication.class)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.sql.init.mode=always",
        "mdviewer.init.enabled=false"
})
@Transactional
class NodeServiceTest {

    @Autowired
    private NodeService nodeService;
    @Autowired
    private DocNodeMapper nodeMapper;
    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbc;

    // ---------- 建树工具：folder 结构 root(A) > [B, C]，B 下有 doc D ----------

    private DocNode folder(Long parent, String name) {
        return nodeService.create(parent, name, true, null, 1L);
    }

    private DocNode doc(Long parent, String name, String content) {
        return nodeService.create(parent, name, false, content, 1L);
    }

    @Test
    void createAssignsPathAndUniqueName() {
        DocNode a = folder(0L, "A");
        assertEquals("/", parentPath(a));
        assertTrue(a.getPath().endsWith(a.getId() + "/"));

        DocNode b = folder(a.getId(), "B");
        assertEquals(a.getPath(), parentPath(b));
        assertEquals("B", b.getName());

        // 同目录重名自动追加 (1)
        DocNode b2 = folder(a.getId(), "B");
        assertEquals("B(1)", b2.getName());
    }

    @Test
    void reorderRejectsIncompleteList() {
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");
        DocNode c = folder(a.getId(), "C");

        // 缺少 C：完整性校验应拦截（曾出 bug：误杀外来节点/漏校验现有节点）
        BizException ex = assertThrows(BizException.class,
                () -> nodeService.reorder(a.getId(), List.of(b.getId())));
        assertEquals(4001, ex.getCode());

        // 完整列表正常排序
        assertDoesNotThrow(() -> nodeService.reorder(a.getId(), List.of(c.getId(), b.getId())));
        assertEquals(1, nodeMapper.selectById(c.getId()).getSortOrder());
        assertEquals(2, nodeMapper.selectById(b.getId()).getSortOrder());
    }

    @Test
    void reorderRejectsDuplicateIds() {
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");
        BizException ex = assertThrows(BizException.class,
                () -> nodeService.reorder(a.getId(), List.of(b.getId(), b.getId())));
        assertEquals(4001, ex.getCode());
    }

    @Test
    void reorderAllowsOneForeignNodeFromOtherDir() {
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");
        DocNode c = folder(a.getId(), "C");
        DocNode root2 = folder(0L, "R2");
        DocNode d = folder(root2.getId(), "D");

        // 跨目录拖入 1 个外来节点：合法（曾出 bug：完整性校验误拦外来节点）
        assertDoesNotThrow(() -> nodeService.reorder(a.getId(),
                List.of(d.getId(), b.getId(), c.getId())));

        DocNode moved = nodeMapper.selectById(d.getId());
        assertEquals(a.getId(), moved.getParentId());
        assertEquals(1, moved.getSortOrder());
        // 子树 path 已重算
        assertTrue(moved.getPath().startsWith(a.getPath()));
    }

    @Test
    void reorderRejectsTwoForeignNodes() {
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");
        DocNode r1 = folder(0L, "R1");
        DocNode r2 = folder(0L, "R2");

        BizException ex = assertThrows(BizException.class,
                () -> nodeService.reorder(a.getId(),
                        List.of(b.getId(), r1.getId(), r2.getId())));
        assertEquals(4001, ex.getCode());
    }

    @Test
    void moveDetectsCycle() {
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");
        DocNode c = folder(b.getId(), "C");

        // 把 A 移到自己子目录 B 下：环检测必须拦截
        BizException ex = assertThrows(BizException.class,
                () -> nodeService.move(a.getId(), b.getId(), null));
        assertEquals(4093, ex.getCode());

        // 把 B 移到 C 下同样是环
        assertThrows(BizException.class, () -> nodeService.move(b.getId(), c.getId(), null));
    }

    @Test
    void moveRejectsDocTargetAndMissingTarget() {
        DocNode a = folder(0L, "A");
        DocNode d = doc(a.getId(), "d.md", "# hi");

        // 文档不能作为目标目录
        assertEquals(4032, assertThrows(BizException.class,
                () -> nodeService.move(a.getId(), d.getId(), null)).getCode());

        // 不存在的目标
        assertEquals(4041, assertThrows(BizException.class,
                () -> nodeService.move(a.getId(), 99999L, null)).getCode());
    }

    @Test
    void moveRewritesSubtreePathAndDedupsName() {
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");
        DocNode child = doc(b.getId(), "inner.md", "x");
        DocNode root2 = folder(0L, "R2");
        DocNode existing = doc(root2.getId(), "B", "y"); // 目标目录已有同名文档

        nodeService.move(b.getId(), root2.getId(), null);

        DocNode moved = nodeMapper.selectById(b.getId());
        assertEquals(root2.getId(), moved.getParentId());
        assertTrue(moved.getPath().startsWith(root2.getPath()));
        // 子节点 path 前缀替换成功
        DocNode movedChild = nodeMapper.selectById(child.getId());
        assertTrue(movedChild.getPath().startsWith(moved.getPath()));
        // 目标目录同名去重（曾出 bug：跨目录拖入未去重）
        assertNotEquals(existing.getName(), moved.getName());
        assertTrue(moved.getName().startsWith("B("));
    }

    @Test
    void moveEnforcesDepthLimit() {
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");
        DocNode c = folder(b.getId(), "C");
        DocNode d = folder(c.getId(), "D");
        DocNode e = folder(d.getId(), "E"); // 已 5 层

        // 单节点移到第 5 层目录 E 下：总深 6，超限
        DocNode f = folder(0L, "F");
        assertEquals(4092, assertThrows(BizException.class,
                () -> nodeService.move(f.getId(), e.getId(), null)).getCode());

        // 5 层子树 A 整体移到另一个目录 R2 下：1 + 5 = 6，超限
        DocNode r2 = folder(0L, "R2");
        assertEquals(4092, assertThrows(BizException.class,
                () -> nodeService.move(a.getId(), r2.getId(), null)).getCode());

        // 合法对照：单节点移到 R2 下不超限
        assertDoesNotThrow(() -> nodeService.move(f.getId(), r2.getId(), null));
    }

    // ---------- 回收站 ----------

    @Test
    void softDeleteMarksWholeSubtreeAndRestoreRecovers() {
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");
        DocNode child = doc(b.getId(), "x.md", "content");

        nodeService.softDelete(b.getId());

        // 子树全部软删：默认查询不可见
        assertNull(nodeMapper.selectById(b.getId()));
        assertNull(nodeMapper.selectById(child.getId()));
        // 回收站列表可见，b 是顶层条目，child 不是
        List<NodeService.RecycleItem> items = nodeService.listRecycle();
        assertEquals(2, items.size());
        NodeService.RecycleItem rootItem = items.stream()
                .filter(i -> i.id().equals(b.getId())).findFirst().orElseThrow();
        assertTrue(rootItem.isRoot());
        assertFalse(items.stream().filter(i -> i.id().equals(child.getId()))
                .findFirst().orElseThrow().isRoot());

        // 内部节点不可直接恢复
        assertEquals(4001, assertThrows(BizException.class,
                () -> nodeService.restore(child.getId())).getCode());

        // 恢复顶层：整树回来
        nodeService.restore(b.getId());
        assertEquals(b.getId(), nodeMapper.selectById(b.getId()).getId());
        assertEquals(child.getId(), nodeMapper.selectById(child.getId()).getId());
    }

    @Test
    void restoreFallsBackToRootWhenParentDeleted() {
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");

        nodeService.softDelete(a.getId()); // 连带 B
        assertEquals(2, nodeService.listRecycle().size());

        // B 是内部节点：拒绝直接恢复，提示恢复顶层条目 A
        assertEquals(4001, assertThrows(BizException.class,
                () -> nodeService.restore(b.getId())).getCode());

        // 恢复 A：整树一起回来
        nodeService.restore(a.getId());
        assertEquals(a.getId(), nodeMapper.selectById(a.getId()).getId());
        assertEquals(b.getId(), nodeMapper.selectById(b.getId()).getId());
    }

    @Test
    void restoreOrphanFallsBackToRoot() throws InterruptedException {
        // 存量孤儿场景无法经正常 API 构造（purge 会连带子树），用 SQL 直接模拟：
        // B 已软删、其父 A 被物理删除 —— restore 的防御分支应把 B 回落到根目录
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");

        jdbc.update("UPDATE doc_node SET deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?", b.getId());
        jdbc.update("DELETE FROM doc_node WHERE id = ?", a.getId());
        assertEquals(1, nodeService.listRecycle().size()); // 只剩孤儿 B

        nodeService.restore(b.getId());
        DocNode restored = nodeMapper.selectById(b.getId());
        assertEquals(0L, restored.getParentId());
        assertTrue(restored.getPath().endsWith(b.getId() + "/"));
    }

    @Test
    void restoreDoesNotReviveIndependentlyDeletedDescendant() {
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");
        DocNode c = doc(b.getId(), "c.md", "x");

        // 先独立删除 C（更早批次），再删除 A（连带 B）
        nodeService.softDelete(c.getId());
        nodeService.softDelete(a.getId());
        assertEquals(3, nodeService.listRecycle().size());

        // 恢复 A：B 随批次复活，但 C 是更早批次，必须保持已删除
        nodeService.restore(a.getId());
        assertNotNull(nodeMapper.selectById(a.getId()));
        assertNotNull(nodeMapper.selectById(b.getId()));
        assertNull(nodeMapper.selectById(c.getId()));
    }

    @Test
    void purgeRemovesPhysically() {
        DocNode a = folder(0L, "A");
        DocNode b = folder(a.getId(), "B");

        nodeService.softDelete(a.getId());
        nodeService.purge(a.getId());

        // 物理删除：连回收站都查不到
        assertTrue(nodeService.listRecycle().stream()
                .noneMatch(i -> i.id().equals(a.getId()) || i.id().equals(b.getId())));
        // 幂等性：重复彻底删除应 4041
        assertEquals(4041, assertThrows(BizException.class,
                () -> nodeService.purge(a.getId())).getCode());
    }

    @Test
    void restoreRenamesWhenSiblingConflict() {
        DocNode a = folder(0L, "A");
        DocNode b = doc(a.getId(), "dup.md", "old");
        nodeService.softDelete(b.getId());
        // 删除后建同名新文档
        doc(a.getId(), "dup.md", "new");

        nodeService.restore(b.getId());
        DocNode restored = nodeMapper.selectById(b.getId());
        assertEquals("dup.md(1)", restored.getName());
    }

    // ---------- 工具 ----------

    /** 物化路径的父路径：/1/5/ -> /1/；/16/ -> /；根返回 "/" 时 strip 后为 "" */
    private static String parentPath(DocNode n) {
        String p = n.getPath();
        if (!p.endsWith("/")) return p;
        String noTail = p.substring(0, p.length() - 1); // /1/5 -> /1 ; /16 -> /
        int lastSlash = noTail.lastIndexOf('/');
        return lastSlash <= 0 ? "/" : noTail.substring(0, lastSlash + 1);
    }
}
