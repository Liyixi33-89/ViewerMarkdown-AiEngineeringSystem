package com.mdviewer.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

/** 文档树节点：文件夹与文档统一建模（技术设计文档 3.2） */
@TableName("doc_node")
public class DocNode {
    public static final int TYPE_FOLDER = 1;
    public static final int TYPE_DOC = 2;
    public static final int STATUS_PUBLISHED = 1;
    public static final int STATUS_DRAFT = 2;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long parentId;
    private String name;
    /** 1=FOLDER 2=DOC */
    private Integer type;
    private String content;
    /** 1=PUBLISHED 2=DRAFT */
    private Integer status;
    private Integer sortOrder;
    /** 物化路径，如 /1/5/12/ */
    private String path;
    @TableLogic
    private Integer deleted;
    private LocalDateTime deletedAt;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getParentId() { return parentId; }
    public void setParentId(Long parentId) { this.parentId = parentId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getType() { return type; }
    public void setType(Integer type) { this.type = type; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public Integer getDeleted() { return deleted; }
    public void setDeleted(Integer deleted) { this.deleted = deleted; }
    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public boolean isFolder() { return type != null && type == TYPE_FOLDER; }
}
