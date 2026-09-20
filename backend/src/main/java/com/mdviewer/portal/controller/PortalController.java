package com.mdviewer.portal.controller;

import com.mdviewer.common.Result;
import com.mdviewer.portal.dto.DocContentDTO;
import com.mdviewer.portal.dto.SearchHitDTO;
import com.mdviewer.portal.dto.TreeItemDTO;
import com.mdviewer.portal.service.PortalService;
import com.mdviewer.sync.VersionRegistry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 前台公开只读接口（无鉴权，技术设计文档 3.3.1） */
@RestController
@RequestMapping("/api/portal")
public class PortalController {
    private final PortalService portalService;
    private final VersionRegistry versionRegistry;

    public PortalController(PortalService portalService, VersionRegistry versionRegistry) {
        this.portalService = portalService;
        this.versionRegistry = versionRegistry;
    }

    @GetMapping("/tree")
    public Result<List<TreeItemDTO>> tree() {
        return Result.ok(portalService.getTree());
    }

    @GetMapping("/docs/{id}/content")
    public Result<DocContentDTO> docContent(@PathVariable Long id) {
        return Result.ok(portalService.getDocContent(id));
    }

    @GetMapping("/search")
    public Result<List<SearchHitDTO>> search(@RequestParam String keyword,
                                             @RequestParam(defaultValue = "name") String scope) {
        // M1 仅名称搜索；scope=content 为 M2 全文检索预留
        return Result.ok(portalService.search(keyword));
    }

    @GetMapping("/version")
    public Result<Long> version() {
        return Result.ok(versionRegistry.current());
    }
}
