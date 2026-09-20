-- H2 开发库建表（应用启动自动执行；与 sql/init.sql 结构一致，语法适配 H2 MODE=MySQL）
CREATE TABLE IF NOT EXISTS doc_node (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  parent_id   BIGINT NOT NULL DEFAULT 0,
  name        VARCHAR(200) NOT NULL,
  type        TINYINT NOT NULL,
  content     CLOB,
  status      TINYINT NOT NULL DEFAULT 1,
  sort_order  INT NOT NULL DEFAULT 0,
  path        VARCHAR(1000) NOT NULL DEFAULT '/',
  deleted     TINYINT NOT NULL DEFAULT 0,
  deleted_at  DATETIME NULL,
  created_by  BIGINT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_user (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'EDITOR',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL
);

CREATE INDEX IF NOT EXISTS idx_dn_parent ON doc_node (parent_id, deleted, status);
CREATE INDEX IF NOT EXISTS idx_dn_name ON doc_node (name);
