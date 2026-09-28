package com.mdviewer.portal.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.mdviewer.common.BizException;
import com.mdviewer.domain.entity.DocNode;
import com.mdviewer.domain.mapper.DocNodeMapper;
import com.mdviewer.portal.dto.DocContentDTO;
import com.mdviewer.portal.dto.SearchHitDTO;
import com.mdviewer.portal.dto.TreeItemDTO;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 前台查询服务：所有查询强制 deleted=0 AND status=PUBLISHED（PRD 4.7 / AGENTS.md 5.2）。
 * 注意：MyBatis-Plus @TableLogic 自动追加 deleted=0；status 由本类显式限定。
 */
@Service
public class PortalService {
    private final DocNodeMapper nodeMapper;

    public PortalService(DocNodeMapper nodeMapper) {
        this.nodeMapper = nodeMapper;
    }

    public List<TreeItemDTO> getTree() {
        List<DocNode> nodes = nodeMapper.selectList(
                new LambdaQueryWrapper<DocNode>()
                        .eq(DocNode::getStatus, DocNode.STATUS_PUBLISHED)
                        .select(DocNode::getId, DocNode::getParentId, DocNode::getName,
                                DocNode::getType, DocNode::getSortOrder));
        return nodes.stream()
                .map(n -> new TreeItemDTO(n.getId(), n.getParentId(), n.getName(),
                        n.isFolder() ? "FOLDER" : "DOC", n.getSortOrder()))
                .collect(Collectors.toList());
    }

    public DocContentDTO getDocContent(Long id) {
        DocNode doc = nodeMapper.selectById(id);
        if (doc == null || doc.isFolder()
                || doc.getStatus() != DocNode.STATUS_PUBLISHED) {
            throw new BizException(4041, "文档不存在");
        }
        // 面包屑：沿 parentId 向上
        List<DocContentDTO.Breadcrumb> crumbs = new ArrayList<>();
        crumbs.add(new DocContentDTO.Breadcrumb(doc.getId(), doc.getName()));
        Long pid = doc.getParentId();
        while (pid != null && pid > 0) {
            DocNode parent = nodeMapper.selectById(pid);
            if (parent == null) break;
            crumbs.add(new DocContentDTO.Breadcrumb(parent.getId(), parent.getName()));
            pid = parent.getParentId();
        }
        // path 文本形式（供搜索结果展示）
        java.util.Collections.reverse(crumbs);

        return new DocContentDTO(doc.getId(), doc.getName(),
                doc.getContent() == null ? "" : doc.getContent(),
                doc.getUpdatedAt() == null ? null : doc.getUpdatedAt().toString(), crumbs);
    }

    public List<SearchHitDTO> search(String keyword) {
        if (keyword == null || keyword.isBlank()) return List.of();
        String kw = keyword.trim();
        // 仅返回文档节点：文件夹不可回显，出现在搜索结果中会产生 4041 导航失败（PRD 3.6）
        // 全文搜索：标题或正文命中；标题命中优先排序
        // 大小写不敏感：H2 的 LIKE 区分大小写（MySQL 默认排序规则不区分），统一 LOWER 后比较；
        // 参数走 {0} 占位符预编译，LIKE 通配符 %/_ 转义后按字面匹配
        String pattern = "%" + escapeLike(kw.toLowerCase()) + "%";
        List<DocNode> nodes = nodeMapper.selectList(
                new LambdaQueryWrapper<DocNode>()
                        .eq(DocNode::getStatus, DocNode.STATUS_PUBLISHED)
                        .eq(DocNode::getType, DocNode.TYPE_DOC)
                        .apply("(LOWER(name) LIKE {0} ESCAPE '!' OR LOWER(content) LIKE {0} ESCAPE '!')", pattern)
                        .last("LIMIT 50"));
        // 面包屑路径文本
        Map<Long, DocNode> all = nodeMapper.selectList(
                        new LambdaQueryWrapper<DocNode>()
                                .eq(DocNode::getStatus, DocNode.STATUS_PUBLISHED)
                                .select(DocNode::getId, DocNode::getParentId, DocNode::getName))
                .stream().collect(Collectors.toMap(DocNode::getId, n -> n));
        String lowerKw = kw.toLowerCase();
        return nodes.stream()
                .map(n -> {
                    boolean nameHit = n.getName().toLowerCase().contains(lowerKw);
                    return new SearchHitDTO(n.getId(), n.getName(), pathText(n, all),
                            snippet(n.getContent(), lowerKw), nameHit ? "NAME" : "CONTENT");
                })
                .sorted(Comparator.comparing((SearchHitDTO h) -> "NAME".equals(h.getMatchType()) ? 0 : 1)
                        .thenComparing(SearchHitDTO::getName))
                .collect(Collectors.toList());
    }

    /** 转义 LIKE 通配符（转义符 !，H2/MySQL 通用），使用户输入的 % _ ! 按字面匹配 */
    static String escapeLike(String s) {
        return s.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    /** 片段窗口：命中点前后各取若干字符 */
    private static final int SNIPPET_BEFORE = 30;
    private static final int SNIPPET_AFTER = 60;

    /**
     * 提取正文命中片段：压缩空白并去掉常见 Markdown 标记后，截取首个命中点附近文本。
     * 未命中正文返回 null（前端只展示路径）。
     */
    static String snippet(String content, String lowerKw) {
        if (content == null || content.isEmpty()) return null;
        String plain = content
                .replaceAll("```[a-zA-Z0-9]*", " ")
                .replaceAll("[#>*`|]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
        int idx = plain.toLowerCase().indexOf(lowerKw);
        if (idx < 0) return null;
        int start = Math.max(0, idx - SNIPPET_BEFORE);
        int end = Math.min(plain.length(), idx + lowerKw.length() + SNIPPET_AFTER);
        return (start > 0 ? "…" : "") + plain.substring(start, end) + (end < plain.length() ? "…" : "");
    }

    private String pathText(DocNode node, Map<Long, DocNode> all) {
        List<String> parts = new ArrayList<>();
        Long pid = node.getParentId();
        while (pid != null && pid > 0) {
            DocNode p = all.get(pid);
            if (p == null) break;
            parts.add(p.getName());
            pid = p.getParentId();
        }
        java.util.Collections.reverse(parts);
        parts.add(node.getName());
        return String.join(" / ", parts);
    }
}
