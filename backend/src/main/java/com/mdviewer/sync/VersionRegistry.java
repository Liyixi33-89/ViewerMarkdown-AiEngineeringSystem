package com.mdviewer.sync;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;

/**
 * 数据版本时间戳（M1 前台轮询 → M2 SSE 推送，技术设计文档 3.4.4）。
 * 所有 admin 写操作成功后必须调用 bump()；portal 只读 current()。
 * bump 同步触发 SSE 广播（SsePushRegistry 对无连接时零开销）。
 */
@Component
public class VersionRegistry {
    private final AtomicLong version = new AtomicLong(System.currentTimeMillis());
    private final SsePushRegistry ssePushRegistry;

    public VersionRegistry(SsePushRegistry ssePushRegistry) {
        this.ssePushRegistry = ssePushRegistry;
    }

    public long current() {
        return version.get();
    }

    public void bump() {
        long v = version.updateAndGet(ver -> Math.max(ver + 1, System.currentTimeMillis()));
        ssePushRegistry.pushVersion(v);
    }
}
