package com.mdviewer.admin.dto;

/** 登录响应：token 对 + 用户信息 */
public record AuthTokens(String accessToken, String refreshToken, UserDTO user) {
    public record UserDTO(Long id, String username, String role) {}
}
