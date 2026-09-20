package com.mdviewer.portal.dto;

/** 搜索命中项 */
public class SearchHitDTO {
    private Long id;
    private String name;
    private String path;

    public SearchHitDTO(Long id, String name, String path) {
        this.id = id;
        this.name = name;
        this.path = path;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getPath() { return path; }
}
