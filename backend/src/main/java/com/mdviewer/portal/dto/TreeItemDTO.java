package com.mdviewer.portal.dto;

/** 前台目录树节点（扁平数组，前端组树；不含 content） */
public class TreeItemDTO {
    private Long id;
    private Long parentId;
    private String name;
    private String type; // FOLDER / DOC
    private Integer sortOrder;

    public TreeItemDTO(Long id, Long parentId, String name, String type, Integer sortOrder) {
        this.id = id;
        this.parentId = parentId;
        this.name = name;
        this.type = type;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public Long getParentId() { return parentId; }
    public String getName() { return name; }
    public String getType() { return type; }
    public Integer getSortOrder() { return sortOrder; }
}
