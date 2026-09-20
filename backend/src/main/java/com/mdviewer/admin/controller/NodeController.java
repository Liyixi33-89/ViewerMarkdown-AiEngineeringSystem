package com.mdviewer.admin.controller;

import com.mdviewer.admin.dto.AuthTokens;
import com.mdviewer.admin.service.NodeService;
import com.mdviewer.admin.service.UploadService;
import com.mdviewer.common.Result;
import com.mdviewer.domain.entity.DocNode;
import com.mdviewer.sync.VersionRegistry;
import jakarta.validation.constraints.NotBlank;
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

import java.util.List;
import java.util.Map;

/** 后台管理接口：树 CRUD / 内容保存 / 移动 / 删除 / 上传（JWT 鉴权） */
@RestController
@RequestMapping("/api/admin")
@Validated
public class NodeController {
    private final NodeService nodeService;
    private final UploadService uploadService;
    private final VersionRegistry versionRegistry;

    public NodeController(NodeService nodeService, UploadService uploadService,
                          VersionRegistry versionRegistry) {
        this.nodeService = nodeService;
        this.uploadService = uploadService;
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

    @DeleteMapping("/nodes/{id}")
    public Result<Void> remove(@PathVariable Long id) {
        nodeService.softDelete(id);
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
