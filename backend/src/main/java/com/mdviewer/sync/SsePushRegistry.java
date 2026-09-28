package com.mdviewer.sync;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * SSE 推送注册表（M2 替代轮询，技术设计文档 3.4.4 升级）：
 * 每个前台连接持有一个 SseEmitter；VersionRegistry.bump() 后由调用方触发 pushAll。
 * 推送失败（连接断开/超时）静默移除，客户端 EventSource 会自动重连。
 */
@Component
public class SsePushRegistry {
    private static final Logger log = LoggerFactory.getLogger(SsePushRegistry.class);
    /** 心跳周期内未完成发送的连接直接丢弃（emitter 自带 timeout 兜底） */
    private static final long EMITTER_TIMEOUT = 0L; // 0=不超时，靠心跳+客户端重连兜底

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter register() {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        return emitter;
    }

    /** 版本变化广播：event=data, payload={"version": <ts>}；失败连接静默剔除 */
    public void pushVersion(long version) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("data")
                        .data(java.util.Map.of("version", version)));
            } catch (IOException | IllegalStateException e) {
                // 连接已断：移除即可，客户端会自动重连后重新注册
                emitters.remove(emitter);
            }
        }
        if (!emitters.isEmpty()) {
            log.debug("SSE pushed version={} to {} clients", version, emitters.size());
        }
    }

    public int clientCount() {
        return emitters.size();
    }
}
