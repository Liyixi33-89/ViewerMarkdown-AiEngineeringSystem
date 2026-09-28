package com.mdviewer.portal.dto;

/** 搜索命中项：matchType=NAME 标题命中 / CONTENT 仅正文命中；snippet 为正文命中片段 */
public class SearchHitDTO {
    private Long id;
    private String name;
    private String path;
    private String snippet;
    private String matchType;

    public SearchHitDTO(Long id, String name, String path, String snippet, String matchType) {
        this.id = id;
        this.name = name;
        this.path = path;
        this.snippet = snippet;
        this.matchType = matchType;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getPath() { return path; }
    public String getSnippet() { return snippet; }
    public String getMatchType() { return matchType; }
}
