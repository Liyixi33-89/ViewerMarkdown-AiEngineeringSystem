package com.mdviewer.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.mdviewer.common.BizException;
import com.mdviewer.domain.entity.DocNode;
import com.mdviewer.domain.mapper.DocNodeMapper;
import com.mdviewer.sync.VersionRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 管理树核心服务：CRUD、移动排序（环检测 + 层级校验）、软删除（技术设计文档 3.4）。
 * 约定：所有写操作成功后 bump 版本戳。
 */
@Service
public class NodeService {
    /** 建议层级上限（PRD 3.4.1） */
    private static final int MAX_DEPTH = 5;

    private final DocNodeMapper nodeMapper;
    private final VersionRegistry versionRegistry;

    public NodeService(DocNodeMapper nodeMapper, VersionRegistry versionRegistry) {
        this.nodeMapper = nodeMapper;
        this.versionRegistry = versionRegistry;
    }

    // ---------- 查询 ----------

    public List<DocNode> listAll() {
        // 管理端全量（含草稿；@TableLogic 自动排除已软删除项——回收站列表单独用 includeDeleted 查询）
        return nodeMapper.selectList(new LambdaQueryWrapper<DocNode>()
                .select(DocNode::getId, DocNode::getParentId, DocNode::getName,
                        DocNode::getType, DocNode::getStatus, DocNode::getSortOrder));
    }

    public DocNode getDoc(Long id) {
        DocNode node = nodeMapper.selectById(id);
        if (node == null || node.isFolder()) throw new BizException(4041, "文档不存在");
        return node;
    }

    // ---------- 创建 ----------

    @Transactional
    public DocNode create(Long parentId, String name, boolean folder, String content, Long userId) {
        DocNode parent = validateParent(parentId);
        DocNode node = new DocNode();
        node.setParentId(parent.getId());
        node.setName(uniqueName(parent.getId(), name));
        node.setType(folder ? DocNode.TYPE_FOLDER : DocNode.TYPE_DOC);
        node.setStatus(DocNode.STATUS_PUBLISHED);
        node.setSortOrder(nextSort(parent.getId()));
        node.setCreatedBy(userId);
        node.setPath(parent.getPath()); // 插入后补全
        if (!folder) node.setContent(content == null ? "" : content);
        nodeMapper.insert(node);
        node.setPath(parent.getPath() + node.getId() + "/");
        nodeMapper.updateById(node);
        versionRegistry.bump();
        return node;
    }

    // ---------- 重命名 / 保存内容 ----------

    @Transactional
    public void rename(Long id, String name) {
        DocNode node = mustExist(id);
        if (name == null || name.isBlank()) throw new BizException(4001, "名称不能为空");
        if (name.length() > 200) throw new BizException(4002, "名称超长（≤200）");
        node.setName(uniqueName(node.getParentId(), name, id));
        nodeMapper.updateById(node);
        versionRegistry.bump();
    }

    @Transactional
    public void saveContent(Long id, String content, String name) {
        DocNode node = mustExist(id);
        if (node.isFolder()) throw new BizException(4003, "文件夹无内容");
        if (content != null && content.length() > 2 * 1024 * 1024) {
            throw new BizException(4002, "内容超过 2MB 限制");
        }
        node.setContent(content == null ? "" : content);
        if (name != null && !name.isBlank()) node.setName(uniqueName(node.getParentId(), name, id));
        nodeMapper.updateById(node);
        versionRegistry.bump();
    }

    // ---------- 移动/排序 ----------

    @Transactional
    public void move(Long id, Long targetParentId, Integer sortOrder) {
        DocNode node = mustExist(id);
        DocNode target = validateParent(targetParentId);

        // 环检测：目标不得是被移动节点自身或其子树（path 前缀判断）
        if (target.getPath().startsWith(node.getPath())) {
            throw new BizException(4093, "不能移动到自身或其子目录下");
        }

        // 层级校验：目标深度 + 子树高度 ≤ MAX_DEPTH
        int targetDepth = countSlashes(target.getPath());
        int subtreeHeight = heightOf(node);
        if (targetDepth + subtreeHeight > MAX_DEPTH) {
            throw new BizException(4092, "层级超过上限（" + MAX_DEPTH + " 层）");
        }

        String oldPathPrefix = node.getPath();
        node.setParentId(target.getId());
        node.setSortOrder(sortOrder != null ? sortOrder : nextSort(target.getId()));
        node.setPath(target.getPath() + node.getId() + "/");
        nodeMapper.updateById(node);

        // 子树 path 批量重算（前缀替换）
        List<DocNode> subtree = nodeMapper.selectList(new LambdaQueryWrapper<DocNode>()
                .likeRight(DocNode::getPath, oldPathPrefix));
        for (DocNode child : subtree) {
            if (child.getId().equals(node.getId())) continue;
            child.setPath(child.getPath().replaceFirst(java.util.regex.Pattern.quote(oldPathPrefix), node.getPath()));
            nodeMapper.updateById(child);
        }
        versionRegistry.bump();
    }

    // ---------- 删除（回收站） ----------

    @Transactional
    public void softDelete(Long id) {
        DocNode node = mustExist(id);
        // 整棵子树标记（path 前缀批量）
        List<DocNode> subtree = nodeMapper.selectList(new LambdaQueryWrapper<DocNode>()
                .likeRight(DocNode::getPath, node.getPath()));
        LocalDateTime now = LocalDateTime.now();
        for (DocNode n : subtree) {
            n.setDeleted(1);
            n.setDeletedAt(now);
            nodeMapper.updateById(n);
        }
        node.setDeleted(1);
        node.setDeletedAt(now);
        nodeMapper.updateById(node);
        versionRegistry.bump();
    }

    // ---------- 内部工具 ----------

    private DocNode mustExist(Long id) {
        DocNode node = nodeMapper.selectById(id);
        if (node == null) throw new BizException(4041, "节点不存在");
        return node;
    }

    private DocNode validateParent(Long parentId) {
        if (parentId == null || parentId == 0) {
            DocNode root = new DocNode();
            root.setId(0L);
            root.setPath("/");
            return root;
        }
        DocNode parent = nodeMapper.selectById(parentId);
        if (parent == null) throw new BizException(4041, "目标目录不存在");
        if (!parent.isFolder()) throw new BizException(4032, "目标不是文件夹");
        return parent;
    }

    private String uniqueName(Long parentId, String name) {
        return uniqueName(parentId, name, null);
    }

    /** 同目录重名自动追加 "(n)"（PRD 4.4.3） */
    private String uniqueName(Long parentId, String name, Long excludeId) {
        List<DocNode> siblings = nodeMapper.selectList(new LambdaQueryWrapper<DocNode>()
                .eq(DocNode::getParentId, parentId));
        java.util.Set<String> names = siblings.stream()
                .filter(n -> excludeId == null || !excludeId.equals(n.getId()))
                .map(DocNode::getName)
                .collect(java.util.stream.Collectors.toSet());
        if (!names.contains(name)) return name;
        for (int i = 1; i < 1000; i++) {
            String candidate = name + "(" + i + ")";
            if (!names.contains(candidate)) return candidate;
        }
        throw new BizException(4091, "重名过多，请手动命名");
    }

    private int nextSort(Long parentId) {
        List<DocNode> siblings = nodeMapper.selectList(new LambdaQueryWrapper<DocNode>()
                .eq(DocNode::getParentId, parentId)
                .select(DocNode::getSortOrder));
        return siblings.stream().mapToInt(n -> n.getSortOrder() == null ? 0 : n.getSortOrder())
                .max().orElse(0) + 1;
    }

    private int countSlashes(String path) {
        return (int) path.chars().filter(c -> c == '/').count() - 1;
    }

    private int heightOf(DocNode node) {
        List<DocNode> subtree = nodeMapper.selectList(new LambdaQueryWrapper<DocNode>()
                .likeRight(DocNode::getPath, node.getPath()));
        return subtree.stream()
                .mapToInt(n -> countSlashes(n.getPath()) - countSlashes(node.getPath()) + 1)
                .max().orElse(1);
    }
}
