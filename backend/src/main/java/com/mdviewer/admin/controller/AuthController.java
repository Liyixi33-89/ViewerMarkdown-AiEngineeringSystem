package com.mdviewer.admin.controller;

import com.mdviewer.admin.dto.AuthTokens;
import com.mdviewer.auth.JwtUtil;
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

    public AuthController(AdminUserMapper userMapper, JwtUtil jwtUtil, BCryptPasswordEncoder encoder) {
        this.userMapper = userMapper;
        this.jwtUtil = jwtUtil;
        this.encoder = encoder;
    }

    public record LoginReq(@NotBlank String username, @NotBlank String password) {}

    @PostMapping("/login")
    public Result<AuthTokens> login(@RequestBody @Validated LoginReq req) {
        AdminUser user = userMapper.selectOne(
                new LambdaQueryWrapper<AdminUser>().eq(AdminUser::getUsername, req.username()));
        if (user == null || !encoder.matches(req.password(), user.getPasswordHash())) {
            throw new BizException(4012, "用户名或密码错误");
        }
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
}
