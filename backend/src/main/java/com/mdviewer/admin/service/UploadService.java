package com.mdviewer.admin.service;

import com.mdviewer.common.BizException;
import com.mdviewer.domain.entity.DocNode;
import com.mdviewer.sync.VersionRegistry;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.MalformedInputException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 上传解析：.md 文件 / 粘贴文本（技术设计文档 3.4.1）。
 * 校验：扩展名白名单、≤2MB、UTF-8 可解码；标题取文件名或首个 # 标题。
 */
@Service
public class UploadService {
    private static final Pattern EXT = Pattern.compile("\\.(md|markdown)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern H1 = Pattern.compile("^#\\s+(.+)$", Pattern.MULTILINE);
    private static final long MAX_BYTES = 2 * 1024 * 1024;

    private final NodeService nodeService;
    private final VersionRegistry versionRegistry;

    public UploadService(NodeService nodeService, VersionRegistry versionRegistry) {
        this.nodeService = nodeService;
        this.versionRegistry = versionRegistry;
    }

    public record UploadResult(String fileName, Long id, String finalName) {}

    public List<UploadResult> uploadFiles(MultipartFile[] files, Long parentId, Long userId) {
        if (files == null || files.length == 0) throw new BizException(4001, "未选择文件");
        List<UploadResult> results = new ArrayList<>();
        for (MultipartFile f : files) {
            String origin = f.getOriginalFilename();
            if (origin == null || !EXT.matcher(origin).find()) {
                throw new BizException(4003, "仅支持 .md / .markdown 文件：" + origin);
            }
            if (f.getSize() > MAX_BYTES) {
                throw new BizException(4002, "文件超过 2MB：" + origin);
            }
            String content;
            try {
                content = decodeUtf8(f);
            } catch (BizException e) {
                throw new BizException(4003, "非 UTF-8 文本文件：" + origin);
            }
            String title = origin.replaceFirst("\\.(md|markdown)$", "");
            DocNode node = nodeService.create(parentId, title, false, content, userId);
            results.add(new UploadResult(origin, node.getId(), node.getName()));
        }
        versionRegistry.bump();
        return results;
    }

    public DocNode uploadText(String title, String content, Long parentId, Long userId) {
        if (title == null || title.isBlank()) throw new BizException(4001, "标题不能为空");
        if (content == null || content.isBlank()) throw new BizException(4001, "内容不能为空");
        if (content.length() > MAX_BYTES) throw new BizException(4002, "内容超过 2MB 限制");
        return nodeService.create(parentId, title, false, content, userId);
    }

    /** 解码并规范化换行符；二进制伪装内容会命中解码失败 */
    private String decodeUtf8(MultipartFile f) {
        byte[] bytes;
        try {
            bytes = f.getBytes();
        } catch (IOException e) {
            throw new BizException(5001, "读取文件失败");
        }
        java.nio.ByteBuffer buf = java.nio.ByteBuffer.wrap(bytes);
        java.nio.charset.CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder();
        try {
            return decoder.decode(buf).toString().replace("\r\n", "\n");
        } catch (MalformedInputException e) {
            throw new BizException(4003, "非 UTF-8 文本文件");
        } catch (Exception e) {
            throw new BizException(4003, "解码失败");
        }
    }

    /** 从内容抽取首个 # 标题（备用） */
    public static String extractTitle(String content, String fallback) {
        Matcher m = H1.matcher(content);
        return m.find() ? m.group(1).trim() : fallback;
    }
}
