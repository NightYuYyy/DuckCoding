// SQLite 数据库管理

use crate::services::session::models::{ProxySession, SessionListResponse};
use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

/// 数据库连接管理器
pub struct SessionDatabase {
    conn: Arc<Mutex<Connection>>,
}

impl SessionDatabase {
    /// 创建或打开数据库
    pub fn new(db_path: PathBuf) -> Result<Self> {
        // 确保父目录存在
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&db_path)?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };

        // 初始化表结构
        db.init_schema()?;

        Ok(db)
    }

    /// 初始化数据库表结构
    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "CREATE TABLE IF NOT EXISTS claude_proxy_sessions (
                session_id TEXT PRIMARY KEY,
                display_id TEXT NOT NULL,
                tool_id TEXT NOT NULL,
                config_name TEXT NOT NULL DEFAULT 'global',
                custom_profile_name TEXT,
                url TEXT NOT NULL,
                api_key TEXT NOT NULL,
                note TEXT,
                first_seen_at INTEGER NOT NULL,
                last_seen_at INTEGER NOT NULL,
                request_count INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // 为已存在的表添加新字段（兼容旧数据库）
        let _ = conn.execute(
            "ALTER TABLE claude_proxy_sessions ADD COLUMN custom_profile_name TEXT",
            [],
        );
        let _ = conn.execute("ALTER TABLE claude_proxy_sessions ADD COLUMN note TEXT", []);

        // 创建索引
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tool_id ON claude_proxy_sessions(tool_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_display_id ON claude_proxy_sessions(display_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_last_seen_at ON claude_proxy_sessions(last_seen_at)",
            [],
        )?;

        Ok(())
    }

    /// 插入或更新会话（Upsert）
    pub fn upsert_session(
        &self,
        session_id: &str,
        display_id: &str,
        tool_id: &str,
        timestamp: i64,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO claude_proxy_sessions (
                session_id, display_id, tool_id, config_name, url, api_key,
                first_seen_at, last_seen_at, request_count,
                created_at, updated_at
            ) VALUES (?1, ?2, ?3, 'global', '', '', ?4, ?4, 1, ?4, ?4)
            ON CONFLICT(session_id) DO UPDATE SET
                last_seen_at = ?4,
                request_count = request_count + 1,
                updated_at = ?4",
            params![session_id, display_id, tool_id, timestamp],
        )?;

        Ok(())
    }

    /// 查询会话列表（分页）
    pub fn get_sessions(
        &self,
        tool_id: &str,
        page: usize,
        page_size: usize,
    ) -> Result<SessionListResponse> {
        let conn = self.conn.lock().unwrap();

        // 查询总数
        let total: usize = conn.query_row(
            "SELECT COUNT(*) FROM claude_proxy_sessions WHERE tool_id = ?1",
            params![tool_id],
            |row| row.get(0),
        )?;

        // 查询分页数据（按最后活跃时间降序）
        let offset = (page.saturating_sub(1)) * page_size;
        let mut stmt = conn.prepare(
            "SELECT session_id, display_id, tool_id, config_name, custom_profile_name,
                    url, api_key, note,
                    first_seen_at, last_seen_at, request_count,
                    created_at, updated_at
             FROM claude_proxy_sessions
             WHERE tool_id = ?1
             ORDER BY last_seen_at DESC
             LIMIT ?2 OFFSET ?3",
        )?;

        let sessions = stmt
            .query_map(params![tool_id, page_size, offset], |row| {
                Ok(ProxySession {
                    session_id: row.get(0)?,
                    display_id: row.get(1)?,
                    tool_id: row.get(2)?,
                    config_name: row.get(3)?,
                    custom_profile_name: row.get(4)?,
                    url: row.get(5)?,
                    api_key: row.get(6)?,
                    note: row.get(7)?,
                    first_seen_at: row.get(8)?,
                    last_seen_at: row.get(9)?,
                    request_count: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(SessionListResponse {
            sessions,
            total,
            page,
            page_size,
        })
    }

    /// 删除单个会话
    pub fn delete_session(&self, session_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM claude_proxy_sessions WHERE session_id = ?1",
            params![session_id],
        )?;
        Ok(())
    }

    /// 清空指定工具的所有会话
    pub fn clear_sessions(&self, tool_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM claude_proxy_sessions WHERE tool_id = ?1",
            params![tool_id],
        )?;
        Ok(())
    }

    /// 清理过期会话（30 天未活跃 + 超过 1000 条限制）
    pub fn cleanup_old_sessions(
        &self,
        tool_id: &str,
        max_count: usize,
        max_age_days: i64,
    ) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        let cutoff_time = now - (max_age_days * 24 * 3600);

        // 1. 删除超过 30 天的会话
        let deleted_by_age = conn.execute(
            "DELETE FROM claude_proxy_sessions WHERE tool_id = ?1 AND last_seen_at < ?2",
            params![tool_id, cutoff_time],
        )?;

        // 2. 如果超过 1000 条，删除最旧的会话
        let current_count: usize = conn.query_row(
            "SELECT COUNT(*) FROM claude_proxy_sessions WHERE tool_id = ?1",
            params![tool_id],
            |row| row.get(0),
        )?;

        let deleted_by_count = if current_count > max_count {
            let to_delete = current_count - max_count;
            conn.execute(
                "DELETE FROM claude_proxy_sessions WHERE session_id IN (
                    SELECT session_id FROM claude_proxy_sessions
                    WHERE tool_id = ?1
                    ORDER BY last_seen_at ASC
                    LIMIT ?2
                )",
                params![tool_id, to_delete],
            )?
        } else {
            0
        };

        Ok(deleted_by_age + deleted_by_count)
    }

    /// 获取会话详情
    pub fn get_session(&self, session_id: &str) -> Result<Option<ProxySession>> {
        let conn = self.conn.lock().unwrap();
        let session = conn
            .query_row(
                "SELECT session_id, display_id, tool_id, config_name, custom_profile_name,
                        url, api_key, note,
                        first_seen_at, last_seen_at, request_count,
                        created_at, updated_at
                 FROM claude_proxy_sessions
                 WHERE session_id = ?1",
                params![session_id],
                |row| {
                    Ok(ProxySession {
                        session_id: row.get(0)?,
                        display_id: row.get(1)?,
                        tool_id: row.get(2)?,
                        config_name: row.get(3)?,
                        custom_profile_name: row.get(4)?,
                        url: row.get(5)?,
                        api_key: row.get(6)?,
                        note: row.get(7)?,
                        first_seen_at: row.get(8)?,
                        last_seen_at: row.get(9)?,
                        request_count: row.get(10)?,
                        created_at: row.get(11)?,
                        updated_at: row.get(12)?,
                    })
                },
            )
            .optional()?;

        Ok(session)
    }

    /// 获取会话配置信息（用于请求处理）
    pub fn get_session_config(&self, session_id: &str) -> Result<Option<(String, String, String)>> {
        let conn = self.conn.lock().unwrap();
        let config = conn
            .query_row(
                "SELECT config_name, url, api_key
                 FROM claude_proxy_sessions
                 WHERE session_id = ?1",
                params![session_id],
                |row| {
                    let config_name: String = row.get(0)?;
                    let url: String = row.get(1)?;
                    let api_key: String = row.get(2)?;
                    Ok((config_name, url, api_key))
                },
            )
            .optional()?;

        Ok(config)
    }

    /// 更新会话配置
    pub fn update_session_config(
        &self,
        session_id: &str,
        config_name: &str,
        custom_profile_name: Option<&str>,
        url: &str,
        api_key: &str,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE claude_proxy_sessions
             SET config_name = ?1, custom_profile_name = ?2, url = ?3, api_key = ?4, updated_at = ?5
             WHERE session_id = ?6",
            params![
                config_name,
                custom_profile_name,
                url,
                api_key,
                now,
                session_id
            ],
        )?;

        Ok(())
    }

    /// 更新会话备注
    pub fn update_session_note(&self, session_id: &str, note: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE claude_proxy_sessions SET note = ?1, updated_at = ?2 WHERE session_id = ?3",
            params![note, now, session_id],
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_database_creation() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let db = SessionDatabase::new(db_path).unwrap();

        // 测试插入
        let timestamp = chrono::Utc::now().timestamp();
        db.upsert_session("test_session_1", "uuid-1", "claude-code", timestamp)
            .unwrap();

        // 测试查询
        let result = db.get_sessions("claude-code", 1, 10).unwrap();
        assert_eq!(result.sessions.len(), 1);
        assert_eq!(result.total, 1);
    }

    #[test]
    fn test_upsert_increments_count() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let db = SessionDatabase::new(db_path).unwrap();

        let timestamp = chrono::Utc::now().timestamp();

        // 第一次插入
        db.upsert_session("test_session_1", "uuid-1", "claude-code", timestamp)
            .unwrap();

        // 第二次插入（应该更新）
        db.upsert_session("test_session_1", "uuid-1", "claude-code", timestamp + 10)
            .unwrap();

        // 验证请求次数
        let session = db.get_session("test_session_1").unwrap().unwrap();
        assert_eq!(session.request_count, 2);
    }
}
