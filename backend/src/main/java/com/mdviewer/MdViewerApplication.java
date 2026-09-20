package com.mdviewer;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * MD Viewer 后端：前台公开只读（portal）+ 后台管理鉴权（admin）。
 */
@SpringBootApplication
@MapperScan("com.mdviewer.domain.mapper")
public class MdViewerApplication {
    public static void main(String[] args) {
        SpringApplication.run(MdViewerApplication.class, args);
    }
}
