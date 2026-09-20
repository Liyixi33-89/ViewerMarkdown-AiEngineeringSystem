package com.mdviewer.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/** JWT 签发与解析（AccessToken 2h / RefreshToken 7d，技术设计文档 3.5） */
@Component
public class JwtUtil {
    private final SecretKey key;
    private final long accessHours;
    private final long refreshDays;

    public JwtUtil(@Value("${mdviewer.jwt.secret}") String secret,
                   @Value("${mdviewer.jwt.access-token-hours:2}") long accessHours,
                   @Value("${mdviewer.jwt.refresh-token-days:7}") long refreshDays) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessHours = accessHours;
        this.refreshDays = refreshDays;
    }

    public String issueAccessToken(Long userId, String username, String role) {
        return issue(userId, username, role, accessHours * 3600);
    }

    public String issueRefreshToken(Long userId, String username, String role) {
        return issue(userId, username, role, refreshDays * 86400);
    }

    private String issue(Long userId, String username, String role, long ttlSeconds) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("username", username)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds)))
                .signWith(key)
                .compact();
    }

    /** 解析失败（过期/伪造）返回 null */
    public Claims parse(String token) {
        try {
            return Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload();
        } catch (Exception e) {
            return null;
        }
    }
}
