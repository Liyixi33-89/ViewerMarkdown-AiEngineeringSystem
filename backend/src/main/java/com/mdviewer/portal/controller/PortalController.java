package com.mdviewer.portal.controller;

import com.mdviewer.common.Result;
import com.mdviewer.portal.dto.DocContentDTO;
import com.mdviewer.portal.dto.SearchHitDTO;
import com.mdviewer.portal.dto.TreeItemDTO;
import com.mdviewer.portal.service.PortalService;
import com.mdviewer.sync.SsePushRegistry;
import com.mdviewer.sync.VersionRegistry;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;

/** 前台公开只读接口（无鉴权，技术设计文档 3.3.1） */
@RestController
@RequestMapping("/api/portal")
public class PortalController {
    private final PortalService portalService;
    private final VersionRegistry versionRegistry;
    private final SsePushRegistry ssePushRegistry;

    public PortalController(PortalService portalService, VersionRegistry versionRegistry,
                            SsePushRegistry ssePushRegistry) {
        this.portalService = portalService;
        this.versionRegistry = versionRegistry;
        this.ssePushRegistry = ssePushRegistry;
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

    /**
     * SSE 版本推送（M2 替代 10s 轮询）：连接即推当前版本，此后每次 bump 实时推。
     * 客户端断开由浏览器 EventSource 自动重连；心跳由 nginx/浏览器超时机制兜底。
     */
    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events() {
        SseEmitter emitter = ssePushRegistry.register();
        try {
            // 连接建立即推一次当前版本（客户端拿它做基线，避免连接空窗期的变更丢失）
            emitter.send(SseEmitter.event()
                    .name("data")
                    .data(java.util.Map.of("version", versionRegistry.current())));
        } catch (IOException e) {
            ssePushRegistry.clientCount(); // no-op：注册失败 emitter 会被 onError 回调移除
        }
        return emitter;
    }
}
