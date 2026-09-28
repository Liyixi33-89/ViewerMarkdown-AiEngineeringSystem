package com.mdviewer.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.mdviewer.common.BizException;
import com.mdviewer.domain.entity.DocNode;
import com.mdviewer.domain.mapper.DocNodeMapper;
import com.mdviewer.sync.VersionRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 整库导出/导入（双库同步）：按「名称路径」定位节点，与自增 id 解耦，
 * 解决本地/线上两套独立库 id 分叉后无法按 id 对齐的问题（技术决策 2026-09-28）。
 * - 导出：全树（含草稿，不含回收站）扁平列表，path 字段为 /目录/目录/文档 名称路径
 * - 导入：幂等 upsert —— 名称路径已存在则更新内容/类型，不存在则逐级建目录
 * - 同名节点在名称路径上歧义时取首个命中（导出时同目录重名本就罕见，uniqueName 已抑制）
 */
@Service
public class SyncService {
    private final DocNodeMapper nodeMapper;
    private final NodeService nodeService;
    private final VersionRegistry versionRegistry;

    public SyncService(DocNodeMapper nodeMapper, NodeService nodeService,
                       VersionRegistry versionRegistry) {
        this.nodeMapper = nodeMapper;
        this.nodeService = nodeService;
        this.versionRegistry = versionRegistry;
    }

    /** 导出条目：namePath 用 '/' 分隔，名称含 '/' 的节点以 '(slash)' 替代（导入时按字面还原不了，接受降级） */
    public record ExportItem(String namePath, boolean folder, Integer sortOrder,
                             Integer status, String content, String updatedAt) {}

    public record ExportPayload(String version, int exportedAt, List<ExportItem> items) {
        public static ExportPayload of(List<ExportItem> items) {
            return new ExportPayload("md-viewer-export/1", (int) (System.currentTimeMillis() / 1000), items);
        }
    }

    // ---------- 导出 ----------

    public ExportPayload exportAll() {
        List<DocNode> nodes = nodeMapper.selectList(new LambdaQueryWrapper<DocNode>()
                .select(DocNode::getId, DocNode::getParentId, DocNode::getName, DocNode::getType,
                        DocNode::getSortOrder, DocNode::getStatus, DocNode::getUpdatedAt));
        Map<Long, DocNode> byId = new HashMap<>();
        for (DocNode n : nodes) byId.put(n.getId(), n);

        List<ExportItem> items = new ArrayList<>();
        for (DocNode n : nodes) {
            items.add(new ExportItem(
                    namePathOf(n, byId),
                    n.isFolder(),
                    n.getSortOrder(),
                    n.getStatus(),
                    n.isFolder() ? null : loadContent(n.getId()),
                    n.getUpdatedAt() == null ? null : n.getUpdatedAt().toString()));
        }
        return ExportPayload.of(items);
    }

    private String loadContent(Long id) {
        DocNode full = nodeMapper.selectById(id);
        return full == null || full.getContent() == null ? "" : full.getContent();
    }

    /** 名称路径：/父名/子名/文档名（顶层节点父 id=0 终止） */
    private String namePathOf(DocNode node, Map<Long, DocNode> byId) {
        List<String> parts = new ArrayList<>();
        DocNode cur = node;
        while (cur != null) {
            parts.add(0, cur.getName().replace("/", "(slash)"));
            Long pid = cur.getParentId();
            cur = (pid == null || pid <= 0) ? null : byId.get(pid);
        }
        return "/" + String.join("/", parts);
    }

    // ---------- 导入 ----------

    public record ImportStats(int created, int updated, int skipped) {}

    /**
     * 幂等导入：逐条按 namePath 在当前树上定位。
     * - 定位到同类型节点：内容/状态有差异则更新，否则跳过
     * - 定位到不同类型节点：跳过并计数（不覆盖文件夹/文档语义）
     * - 不存在：逐级创建父目录后创建节点
     * 名称路径以 '/' 分段；路径必须以 '/' 开头且非空。
     */
    @Transactional
    public ImportStats importAll(ExportPayload payload) {
        if (payload == null || payload.items() == null) throw new BizException(4001, "导入数据为空");
        if (!"md-viewer-export/1".equals(payload.version())) {
            throw new BizException(4001, "不支持的导出文件版本：" + payload.version());
        }

        int created = 0, updated = 0, skipped = 0;
        for (ExportItem item : payload.items()) {
            String[] segs = parsePath(item.namePath());
            // 父目录逐级确保存在（新建计入 created；撞名文档报错）
            Long parentId = 0L;
            for (int i = 0; i < segs.length - 1; i++) {
                DocNode folder = findChild(parentId, segs[i]);
                if (folder == null) {
                    parentId = nodeService.create(parentId, segs[i], true, null, null).getId();
                    created++;
                } else if (!folder.isFolder()) {
                    throw new BizException(4001,
                            "路径段「" + segs[i] + "」已存在同名文档，无法作为目录");
                } else {
                    parentId = folder.getId();
                }
            }
            String name = segs[segs.length - 1];

            DocNode existing = findChild(parentId, name);
            boolean folder = Boolean.TRUE.equals(item.folder());
            if (existing == null) {
                if (folder) {
                    nodeService.create(parentId, name, true, null, null);
                } else {
                    nodeService.create(parentId, name, false,
                            item.content() == null ? "" : item.content(), null);
                }
                created++;
            } else if (existing.isFolder() != folder) {
                skipped++; // 类型冲突：文档 vs 文件夹，不覆盖
            } else if (folder) {
                skipped++; // 文件夹内容无差异可比较
            } else {
                String incoming = item.content() == null ? "" : item.content();
                if (!incoming.equals(existing.getContent())) {
                    existing.setContent(incoming);
                    nodeMapper.updateById(existing);
                    updated++;
                } else {
                    skipped++;
                }
            }
        }
        if (created + updated > 0) versionRegistry.bump();
        return new ImportStats(created, updated, skipped);
    }

    private String[] parsePath(String namePath) {
        if (namePath == null || !namePath.startsWith("/") || namePath.length() < 2) {
            throw new BizException(4001, "非法名称路径：" + namePath);
        }
        String[] segs = namePath.substring(1).split("/", -1);
        for (String s : segs) {
            if (s.isBlank()) throw new BizException(4001, "名称路径含空段：" + namePath);
        }
        return segs;
    }

    /** 子节点查找（含草稿；MP @TableLogic 自动排除已删除） */
    private DocNode findChild(Long parentId, String name) {
        return nodeMapper.selectList(new LambdaQueryWrapper<DocNode>()
                        .eq(DocNode::getParentId, parentId)
                        .eq(DocNode::getName, name))
                .stream().findFirst().orElse(null);
    }
}
