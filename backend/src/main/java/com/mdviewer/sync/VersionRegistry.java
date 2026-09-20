package com.mdviewer.sync;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;

/**
 * 数据版本时间戳（M1 前台轮询同步，技术设计文档 3.4.4）。
 * 所有 admin 写操作成功后必须调用 bump()；portal 只读 current()。
 */
@Component
public class VersionRegistry {
    private final AtomicLong version = new AtomicLong(System.currentTimeMillis());

    public long current() {
        return version.get();
    }

    public void bump() {
        version.updateAndGet(v -> Math.max(v + 1, System.currentTimeMillis()));
    }
}
