package com.mdviewer.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mdviewer.auth.JwtAuthFilter;
import com.mdviewer.common.Result;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 安全配置：/api/portal/** 公开只读；/api/admin/** 需 JWT（EDITOR/SUPER_ADMIN）。
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter,
                                           ObjectMapper objectMapper) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/portal/**").permitAll()
                    .requestMatchers("/api/admin/auth/login").permitAll()
                    .requestMatchers("/api/admin/auth/refresh").permitAll() // 无感续期：refreshToken 自校验
                    .requestMatchers("/api/admin/**").hasAnyRole("EDITOR", "SUPER_ADMIN")
                    .requestMatchers("/doc.html", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                    .anyRequest().permitAll())
            .exceptionHandling(eh -> eh.authenticationEntryPoint((req, resp, ex) -> {
                resp.setStatus(401);
                resp.setContentType(MediaType.APPLICATION_JSON_VALUE);
                resp.setCharacterEncoding(StandardCharsets.UTF_8.name());
                resp.getWriter().write(objectMapper.writeValueAsString(Result.error(4010, "未登录或登录已过期")));
            }))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private CorsConfigurationSource corsSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOriginPatterns(List.of("*")); // 生产收紧为白名单域名
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }
}
