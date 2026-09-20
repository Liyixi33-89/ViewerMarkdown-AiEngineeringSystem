-- MD Viewer 建表脚本（MySQL 8；技术设计文档 3.2 节）
-- 注意：本文件为冻结基线，修改需人工确认（AGENTS.md 权限分级）
-- H2 开发模式由 JPA/启动脚本自动建表，此脚本用于 MySQL 生产部署。

CREATE DATABASE IF NOT EXISTS md_viewer DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE md_viewer;

-- 文档树节点（文件夹与文档统一建模；path 为物化路径冗余列）
CREATE TABLE IF NOT EXISTS doc_node (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  parent_id   BIGINT NOT NULL DEFAULT 0 COMMENT '父节点，0=根',
  name        VARCHAR(200) NOT NULL,
  type        TINYINT NOT NULL COMMENT '1=FOLDER 2=DOC',
  content     MEDIUMTEXT COMMENT 'Markdown 原文，仅 DOC',
  status      TINYINT NOT NULL DEFAULT 1 COMMENT '1=PUBLISHED 2=DRAFT',
  sort_order  INT NOT NULL DEFAULT 0,
  path        VARCHAR(1000) NOT NULL DEFAULT '/' COMMENT '物化路径，如 /1/5/12/',
  deleted     TINYINT NOT NULL DEFAULT 0 COMMENT '软删除（回收站）',
  deleted_at  DATETIME NULL,
  created_by  BIGINT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_parent (parent_id, deleted, status),
  KEY idx_name (name),
  KEY idx_path (path(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 后台管理员（与前台访客无关）
CREATE TABLE IF NOT EXISTS admin_user (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL COMMENT 'BCrypt',
  role          VARCHAR(20) NOT NULL DEFAULT 'EDITOR' COMMENT 'SUPER_ADMIN/EDITOR',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 版本历史（P2 预留）
CREATE TABLE IF NOT EXISTS doc_version (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  doc_id     BIGINT NOT NULL,
  content    MEDIUMTEXT NOT NULL,
  created_by BIGINT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_doc (doc_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 站点设置（P2 预留，KV）
CREATE TABLE IF NOT EXISTS site_setting (
  skey   VARCHAR(50) PRIMARY KEY,
  svalue VARCHAR(500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初始管理员（密码 BCrypt(admin123)，由应用启动初始化器维护，此处仅为手动部署示例）
-- INSERT INTO admin_user (username, password_hash, role) VALUES ('admin', '<bcrypt-hash>', 'SUPER_ADMIN');
