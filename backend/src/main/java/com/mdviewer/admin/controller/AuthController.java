package com.mdviewer.admin.controller;

import com.mdviewer.admin.dto.AuthTokens;
import com.mdviewer.auth.JwtUtil;
import com.mdviewer.auth.LoginGuard;
import com.mdviewer.common.BizException;
import com.mdviewer.common.Result;
import com.mdviewer.domain.entity.AdminUser;
import com.mdviewer.domain.mapper.AdminUserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.jsonwebtoken.Claims;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

/** 后台认证：登录 / 刷新 token */
@RestController
@RequestMapping("/api/admin/auth")
@Validated
public class AuthController {
    private final AdminUserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder encoder;
    private final LoginGuard loginGuard;

    public AuthController(AdminUserMapper userMapper, JwtUtil jwtUtil,
                          BCryptPasswordEncoder encoder, LoginGuard loginGuard) {
        this.userMapper = userMapper;
        this.jwtUtil = jwtUtil;
        this.encoder = encoder;
        this.loginGuard = loginGuard;
    }

    public record LoginReq(@NotBlank String username, @NotBlank String password) {}

    @PostMapping("/login")
    public Result<AuthTokens> login(@RequestBody @Validated LoginReq req) {
        loginGuard.checkLocked(req.username());
        AdminUser user = userMapper.selectOne(
                new LambdaQueryWrapper<AdminUser>().eq(AdminUser::getUsername, req.username()));
        if (user == null || !encoder.matches(req.password(), user.getPasswordHash())) {
            loginGuard.recordFail(req.username());
            throw new BizException(4012, "用户名或密码错误");
        }
        loginGuard.clear(req.username());
        user.setLastLoginAt(LocalDateTime.now());
        userMapper.updateById(user);
        return Result.ok(new AuthTokens(
                jwtUtil.issueAccessToken(user.getId(), user.getUsername(), user.getRole()),
                jwtUtil.issueRefreshToken(user.getId(), user.getUsername(), user.getRole()),
                new AuthTokens.UserDTO(user.getId(), user.getUsername(), user.getRole())));
    }

    public record RefreshReq(@NotBlank String refreshToken) {}

    @PostMapping("/refresh")
    public Result<AuthTokens> refresh(@RequestBody @Validated RefreshReq req) {
        Claims claims = jwtUtil.parse(req.refreshToken());
        if (claims == null) throw new BizException(4013, "refreshToken 无效或已过期");
        AdminUser user = userMapper.selectById(Long.valueOf(claims.getSubject()));
        if (user == null) throw new BizException(4013, "用户不存在");
        return Result.ok(new AuthTokens(
                jwtUtil.issueAccessToken(user.getId(), user.getUsername(), user.getRole()),
                req.refreshToken(),
                new AuthTokens.UserDTO(user.getId(), user.getUsername(), user.getRole())));
    }

    /** 修改密码：需登录态，旧密码校验 + 新密码强度检查（安全加固 2026-09-21） */
    public record ChangePasswordReq(
            @NotBlank String oldPassword,
            @NotBlank String newPassword) {}

    @PostMapping("/change-password")
    public Result<Void> changePassword(@RequestBody @Validated ChangePasswordReq req,
                                       @org.springframework.security.core.annotation.AuthenticationPrincipal
                                       String subject) {
        if (req.newPassword().length() < 8) {
            throw new BizException(4014, "新密码至少 8 位");
        }
        if (req.newPassword().equals(req.oldPassword())) {
            throw new BizException(4014, "新密码不能与旧密码相同");
        }
        AdminUser user = userMapper.selectById(Long.valueOf(subject));
        if (user == null || !encoder.matches(req.oldPassword(), user.getPasswordHash())) {
            throw new BizException(4012, "旧密码错误");
        }
        user.setPasswordHash(encoder.encode(req.newPassword()));
        userMapper.updateById(user);
        return Result.ok(null);
    }
}
