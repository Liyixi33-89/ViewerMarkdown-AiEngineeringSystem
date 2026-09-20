package com.mdviewer.portal.dto;

import java.util.List;

/** 文档正文（含面包屑） */
public class DocContentDTO {
    private Long id;
    private String name;
    private String content;
    private String updatedAt;
    private List<Breadcrumb> breadcrumb;

    public record Breadcrumb(Long id, String name) {}

    public DocContentDTO(Long id, String name, String content, String updatedAt, List<Breadcrumb> breadcrumb) {
        this.id = id;
        this.name = name;
        this.content = content;
        this.updatedAt = updatedAt;
        this.breadcrumb = breadcrumb;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getContent() { return content; }
    public String getUpdatedAt() { return updatedAt; }
    public List<Breadcrumb> getBreadcrumb() { return breadcrumb; }
}
