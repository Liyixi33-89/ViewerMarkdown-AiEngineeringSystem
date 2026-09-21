package com.mdviewer.auth;

import com.mdviewer.common.BizException;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 登录失败限流（安全加固 2026-09-21）：单机内存版。
 * 按用户名统计连续失败次数：达到 5 次锁定 10 分钟，成功登录清零。
 */
@Component
public class LoginGuard {
    private static final int MAX_FAILS = 5;
    private static final long LOCK_MS = 10 * 60 * 1000L;

    private static class FailState {
        int count;
        long lastFailAt;
    }

    private final Map<String, FailState> fails = new ConcurrentHashMap<>();

    /** 登录前检查：被锁定则抛业务异常 */
    public void checkLocked(String username) {
        FailState state = fails.get(username);
        if (state == null) return;
        synchronized (state) {
            if (state.count >= MAX_FAILS
                    && System.currentTimeMillis() - state.lastFailAt < LOCK_MS) {
                throw new BizException(4015, "失败次数过多，账号已锁定 10 分钟");
            }
            // 锁定期已过：重置
            if (state.count >= MAX_FAILS) {
                state.count = 0;
            }
        }
    }

    /** 记录一次失败 */
    public void recordFail(String username) {
        fails.computeIfAbsent(username, k -> new FailState());
        FailState state = fails.get(username);
        synchronized (state) {
            state.count++;
            state.lastFailAt = System.currentTimeMillis();
        }
    }

    /** 登录成功：清零 */
    public void clear(String username) {
        fails.remove(username);
    }
}
