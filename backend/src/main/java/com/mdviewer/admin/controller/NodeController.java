package com.mdviewer.admin.controller;

import com.mdviewer.admin.dto.AuthTokens;
import com.mdviewer.admin.service.NodeService;
import com.mdviewer.admin.service.SyncService;
import com.mdviewer.admin.service.UploadService;
import com.mdviewer.common.Result;
import com.mdviewer.domain.entity.DocNode;
import com.mdviewer.domain.entity.DocVersion;
import com.mdviewer.sync.VersionRegistry;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;

/** 后台管理接口：树 CRUD / 内容保存 / 移动 / 删除 / 上传（JWT 鉴权） */
@RestController
@RequestMapping("/api/admin")
@Validated
public class NodeController {
    private final NodeService nodeService;
    private final UploadService uploadService;
    private final SyncService syncService;
    private final VersionRegistry versionRegistry;

    public NodeController(NodeService nodeService, UploadService uploadService,
                          SyncService syncService, VersionRegistry versionRegistry) {
        this.nodeService = nodeService;
        this.uploadService = uploadService;
        this.syncService = syncService;
        this.versionRegistry = versionRegistry;
    }

    // ---------- 树 ----------
    @GetMapping("/tree")
    public Result<List<DocNode>> tree() {
        return Result.ok(nodeService.listAll());
    }

    public record CreateFolderReq(@NotNull Long parentId, @NotBlank String name) {}

    @PostMapping("/nodes/folder")
    public Result<Map<String, Object>> createFolder(@RequestBody @Validated CreateFolderReq req) {
        DocNode node = nodeService.create(req.parentId(), req.name(), true, null, userId());
        return Result.ok(Map.of("id", node.getId(), "finalName", node.getName()));
    }

    public record CreateDocReq(@NotNull Long parentId, @NotBlank String name, String content) {}

    @PostMapping("/nodes/doc")
    public Result<Map<String, Object>> createDoc(@RequestBody @Validated CreateDocReq req) {
        DocNode node = nodeService.create(req.parentId(), req.name(), false, req.content(), userId());
        return Result.ok(Map.of("id", node.getId(), "finalName", node.getName()));
    }

    public record RenameReq(@NotBlank String name) {}

    @PutMapping("/nodes/{id}/name")
    public Result<Void> rename(@PathVariable Long id, @RequestBody @Validated RenameReq req) {
        nodeService.rename(id, req.name());
        return Result.ok();
    }

    public record SaveContentReq(String content, String name) {}

    @PutMapping("/nodes/{id}/content")
    public Result<Void> saveContent(@PathVariable Long id, @RequestBody SaveContentReq req) {
        nodeService.saveContent(id, req.content(), req.name());
        return Result.ok();
    }

    /** 管理端读取文档全量（含草稿） */
    @GetMapping("/nodes/{id}/doc")
    public Result<DocNode> getDoc(@PathVariable Long id) {
        DocNode doc = nodeService.getDoc(id);
        return Result.ok(doc);
    }

    public record MoveReq(@NotNull Long targetParentId, Integer sortOrder) {}

    @PutMapping("/nodes/{id}/move")
    public Result<Void> move(@PathVariable Long id, @RequestBody @Validated MoveReq req) {
        nodeService.move(id, req.targetParentId(), req.sortOrder());
        return Result.ok();
    }

    /** 批量排序请求：orderedIds 为同一父目录下重排后的完整子节点 id 序列 */
    public record ReorderReq(@NotNull Long parentId, @NotEmpty List<Long> orderedIds) {}

    @PutMapping("/nodes/order")
    public Result<Void> reorder(@RequestBody @Validated ReorderReq req) {
        nodeService.reorder(req.parentId(), req.orderedIds());
        return Result.ok();
    }

    @DeleteMapping("/nodes/{id}")
    public Result<Void> remove(@PathVariable Long id) {
        nodeService.softDelete(id);
        return Result.ok();
    }

    // ---------- 回收站 ----------

    @GetMapping("/recycle")
    public Result<List<NodeService.RecycleItem>> recycle() {
        return Result.ok(nodeService.listRecycle());
    }

    @PutMapping("/recycle/{id}/restore")
    public Result<Map<String, Object>> restore(@PathVariable Long id) {
        return Result.ok(nodeService.restore(id));
    }

    @DeleteMapping("/recycle/{id}")
    public Result<Void> purge(@PathVariable Long id) {
        nodeService.purge(id);
        return Result.ok();
    }

    // ---------- 导出 / 导入（双库同步） ----------

    @GetMapping("/export")
    public Result<SyncService.ExportPayload> exportAll() {
        return Result.ok(syncService.exportAll());
    }

    /**
     * 导入：body 为导出 JSON。手动读 body 字符串而非 @RequestBody 反序列化，
     * 以兼容带 UTF-8 BOM 的文件（Windows 记事本 / PowerShell Out-File 默认带 BOM，
     * Jackson 遇 BOM 直接解析失败，2026-09-28 实测踩坑）。
     * 未知字段容错：用户可能误传完整接口响应（含 code/msg/data 包装），给出明确报错而非 500。
     */
    @PostMapping("/import")
    public Result<SyncService.ImportStats> importAll(HttpServletRequest request) throws java.io.IOException {
        String body = request.getReader().lines()
                .collect(java.util.stream.Collectors.joining("\n"));
        if (body != null && !body.isEmpty() && body.charAt(0) == '\uFEFF') {
            body = body.substring(1); // 去 BOM
        }
        com.fasterxml.jackson.databind.ObjectMapper mapper =
                new com.fasterxml.jackson.databind.ObjectMapper()
                        .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        SyncService.ExportPayload payload = mapper.readValue(body, SyncService.ExportPayload.class);
        // 误传完整响应时取 data 字段（items 在 data 里）
        if (payload.items() == null && body.contains("\"data\"")) {
            var root = mapper.readTree(body);
            if (root.has("data")) {
                payload = mapper.treeToValue(root.get("data"), SyncService.ExportPayload.class);
            }
        }
        return Result.ok(syncService.importAll(payload));
    }

    // ---------- 版本历史（PRD P2） ----------

    @GetMapping("/nodes/{id}/versions")
    public Result<List<NodeService.VersionItem>> versions(@PathVariable Long id) {
        return Result.ok(nodeService.listVersions(id));
    }

    @GetMapping("/nodes/{id}/versions/{versionId}")
    public Result<DocVersion> version(@PathVariable Long id, @PathVariable Long versionId) {
        return Result.ok(nodeService.getVersion(id, versionId));
    }

    public record RollbackReq(@NotNull Long versionId) {}

    @PutMapping("/nodes/{id}/versions/{versionId}/rollback")
    public Result<Void> rollback(@PathVariable Long id, @PathVariable Long versionId) {
        nodeService.rollback(id, versionId, userId());
        return Result.ok();
    }

    // ---------- 上传 ----------
    @PostMapping("/upload/file")
    public Result<List<UploadService.UploadResult>> uploadFile(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "parentId", defaultValue = "0") Long parentId) {
        return Result.ok(uploadService.uploadFiles(files, parentId, userId()));
    }

    public record UploadTextReq(@NotBlank String title, @NotBlank String content,
                                @NotNull Long parentId) {}

    @PostMapping("/upload/text")
    public Result<Map<String, Object>> uploadText(@RequestBody @Validated UploadTextReq req) {
        DocNode node = uploadService.uploadText(req.title(), req.content(), req.parentId(), userId());
        return Result.ok(Map.of("id", node.getId(), "finalName", node.getName()));
    }

    // ---------- 工具 ----------
    private Long userId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "未认证");
        }
        try {
            return Long.valueOf(auth.getPrincipal().toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
