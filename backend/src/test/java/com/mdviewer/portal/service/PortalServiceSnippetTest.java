package com.mdviewer.portal.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** 全文搜索片段提取：纯函数单测，不启动 Spring 上下文 */
class PortalServiceSnippetTest {

    @Test
    void returnsNullWhenContentMissOrEmpty() {
        assertNull(PortalService.snippet(null, "x"));
        assertNull(PortalService.snippet("", "x"));
        assertNull(PortalService.snippet("hello world", "闭包"));
    }

    @Test
    void caseInsensitiveHitAndMarkdownStripped() {
        String s = PortalService.snippet("## 标题\n\n**Fiber** 是 React 的调度单元", "fiber");
        assertNotNull(s);
        assertTrue(s.contains("Fiber"));
        assertFalse(s.contains("**"));
        assertFalse(s.contains("#"));
    }

    @Test
    void longContentIsWindowedWithEllipsis() {
        String content = "a".repeat(200) + "闭包" + "b".repeat(200);
        String s = PortalService.snippet(content, "闭包");
        assertNotNull(s);
        assertTrue(s.startsWith("…"));
        assertTrue(s.endsWith("…"));
        assertTrue(s.contains("闭包"));
        assertTrue(s.length() < 120);
    }

    @Test
    void likeWildcardsEscaped() {
        assertEquals("100!%", PortalService.escapeLike("100%"));
        assertEquals("a!_b", PortalService.escapeLike("a_b"));
        assertEquals("c!!d", PortalService.escapeLike("c!d"));
    }

    @Test
    void whitespaceCollapsed() {
        String s = PortalService.snippet("前端\n\n\n   面试   题", "面试");
        assertEquals("前端 面试 题", s);
    }
}
