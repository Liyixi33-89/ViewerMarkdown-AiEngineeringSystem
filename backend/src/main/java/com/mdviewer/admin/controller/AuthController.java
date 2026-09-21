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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

/** 后台认证：登录（HttpOnly cookie 24h）/ 改密码 / 当前用户（2026-09-21 cookie 会话改造） */
@RestController
@RequestMapping("/api/admin/auth")
@Validated
public class AuthController {
    private final AdminUserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder encoder;
    private final LoginGuard loginGuard;

    /** cookie 会话有效期 24h */
    private static final int COOKIE_MAX_AGE = 24 * 60 * 60;
    private static final String COOKIE_NAME = "mdv_token";

    public AuthController(AdminUserMapper userMapper, JwtUtil jwtUtil,
                          BCryptPasswordEncoder encoder, LoginGuard loginGuard) {
        this.userMapper = userMapper;
        this.jwtUtil = jwtUtil;
        this.encoder = encoder;
        this.loginGuard = loginGuard;
    }

    public record LoginReq(@NotBlank String username, @NotBlank String password) {}

    @PostMapping("/login")
    public Result<AuthTokens> login(@RequestBody @Validated LoginReq req,
                                    jakarta.servlet.http.HttpServletResponse response) {
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
        String accessToken = jwtUtil.issueAccessToken(user.getId(), user.getUsername(), user.getRole());
        // HttpOnly cookie：JS 不可读，XSS 无法窃取；24h 有效期（SameSite=Lax 防 CSRF）
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie(COOKIE_NAME, accessToken);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(COOKIE_MAX_AGE);
        response.addCookie(cookie);
        // 响应体仍返回 user 信息供前端渲染；token 字段留空（前端不再持久化）
        return Result.ok(new AuthTokens(
                "",
                "",
                new AuthTokens.UserDTO(user.getId(), user.getUsername(), user.getRole())));
    }

    /** 登出：清 cookie */
    @PostMapping("/logout")
    public Result<Void> logout(jakarta.servlet.http.HttpServletResponse response) {
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie(COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return Result.ok(null);
    }

    /** 恢复会话：cookie 有效时返回当前用户（前端刷新后调用）。
     *  注意：白名单放行后 principal 是 "anonymousUser"，必须自己解析 cookie（已踩坑 500） */
    @GetMapping("/me")
    public Result<AuthTokens.UserDTO> me(jakarta.servlet.http.HttpServletRequest request) {
        String subject = resolveSubjectFromCookie(request);
        if (subject == null) throw new BizException(4010, "未登录");
        AdminUser user = userMapper.selectById(Long.valueOf(subject));
        if (user == null) throw new BizException(4010, "未登录");
        return Result.ok(new AuthTokens.UserDTO(user.getId(), user.getUsername(), user.getRole()));
    }

    /** 从请求 cookie 中解析 JWT subject；无效/缺失返回 null */
    private String resolveSubjectFromCookie(jakarta.servlet.http.HttpServletRequest request) {
        jakarta.servlet.http.Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (jakarta.servlet.http.Cookie c : cookies) {
            if (COOKIE_NAME.equals(c.getName())) {
                Claims claims = jwtUtil.parse(c.getValue());
                return claims == null ? null : claims.getSubject();
            }
        }
        return null;
    }

    /** 修改密码：需登录态，旧密码校验 + 新密码强度检查（安全加固 2026-09-21） */
    public record ChangePasswordReq(
            @NotBlank String oldPassword,
            @NotBlank String newPassword) {}

    @PostMapping("/change-password")
    public Result<Void> changePassword(@RequestBody @Validated ChangePasswordReq req,
                                       @org.springframework.security.core.annotation.AuthenticationPrincipal
                                       String subject,
                                       jakarta.servlet.http.HttpServletResponse response) {
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
        // 改密后作废当前 cookie（强制重新登录）
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie(COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return Result.ok(null);
    }
}
