"""
Iranian Legal Archive - Authentication Database Schema
Database schema and initialization for authentication system
"""

import sqlite3
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class AuthDatabase:
    def __init__(self, db_path: str = "auth.db"):
        self.db_path = db_path
        self._init_database()

    def _init_database(self):
        """Initialize the authentication database with all required tables"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Enable foreign key constraints
                cursor.execute("PRAGMA foreign_keys = ON")
                
                # Create users table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        email TEXT UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT NOT NULL CHECK (role IN ('admin', 'lawyer', 'researcher', 'viewer')),
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        last_login TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1,
                        failed_login_attempts INTEGER DEFAULT 0,
                        locked_until TIMESTAMP,
                        profile_data TEXT, -- JSON data for additional user info
                        two_factor_enabled BOOLEAN DEFAULT 0,
                        two_factor_secret TEXT,
                        email_verified BOOLEAN DEFAULT 0,
                        email_verification_token TEXT,
                        password_reset_token TEXT,
                        password_reset_expires TIMESTAMP
                    )
                """)
                
                # Create sessions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        token_hash TEXT NOT NULL,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP NOT NULL,
                        is_active BOOLEAN DEFAULT 1,
                        ip_address TEXT,
                        user_agent TEXT,
                        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                """)
                
                # Create audit_log table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS audit_log (
                        id TEXT PRIMARY KEY,
                        user_id TEXT,
                        action TEXT NOT NULL,
                        resource TEXT,
                        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ip_address TEXT,
                        user_agent TEXT,
                        details TEXT, -- JSON data
                        severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
                    )
                """)
                
                # Create user_permissions table for fine-grained access control
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_permissions (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        permission TEXT NOT NULL,
                        resource TEXT,
                        granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        granted_by TEXT,
                        expires_at TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                        FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE SET NULL,
                        UNIQUE(user_id, permission, resource)
                    )
                """)
                
                # Create role_permissions table for role-based permissions
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS role_permissions (
                        id TEXT PRIMARY KEY,
                        role TEXT NOT NULL,
                        permission TEXT NOT NULL,
                        resource TEXT,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(role, permission, resource)
                    )
                """)
                
                # Create login_attempts table for security monitoring
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS login_attempts (
                        id TEXT PRIMARY KEY,
                        email TEXT NOT NULL,
                        ip_address TEXT NOT NULL,
                        user_agent TEXT,
                        success BOOLEAN NOT NULL,
                        failure_reason TEXT,
                        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        country TEXT,
                        city TEXT
                    )
                """)
                
                # Create user_preferences table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_preferences (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL UNIQUE,
                        language TEXT DEFAULT 'fa',
                        theme TEXT DEFAULT 'light',
                        timezone TEXT DEFAULT 'Asia/Tehran',
                        notifications TEXT, -- JSON data
                        search_preferences TEXT, -- JSON data
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                """)
                
                # Create indexes for performance
                self._create_indexes(cursor)
                
                # Insert default role permissions
                self._insert_default_permissions(cursor)
                
                conn.commit()
                logger.info("Authentication database initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize authentication database: {e}")
            raise

    def _create_indexes(self, cursor):
        """Create database indexes for optimal performance"""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
            "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)",
            "CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON audit_log(severity)",
            "CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission)",
            "CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role)",
            "CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)",
            "CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)",
            "CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp ON login_attempts(timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)"
        ]
        
        for index_sql in indexes:
            cursor.execute(index_sql)

    def _insert_default_permissions(self, cursor):
        """Insert default role-based permissions"""
        default_permissions = [
            # Admin permissions
            ("admin", "read", "all"),
            ("admin", "write", "all"),
            ("admin", "delete", "all"),
            ("admin", "manage_users", "users"),
            ("admin", "manage_system", "system"),
            ("admin", "view_audit_logs", "audit"),
            ("admin", "manage_permissions", "permissions"),
            
            # Lawyer permissions
            ("lawyer", "read", "documents"),
            ("lawyer", "write", "documents"),
            ("lawyer", "search", "documents"),
            ("lawyer", "analyze", "documents"),
            ("lawyer", "export", "documents"),
            ("lawyer", "create_reports", "reports"),
            
            # Researcher permissions
            ("researcher", "read", "documents"),
            ("researcher", "search", "documents"),
            ("researcher", "analyze", "documents"),
            ("researcher", "export", "documents"),
            ("researcher", "create_reports", "reports"),
            
            # Viewer permissions
            ("viewer", "read", "documents"),
            ("viewer", "search", "documents")
        ]
        
        for role, permission, resource in default_permissions:
            cursor.execute("""
                INSERT OR IGNORE INTO role_permissions (id, role, permission, resource)
                VALUES (?, ?, ?, ?)
            """, (f"{role}_{permission}_{resource}", role, permission, resource))

    def get_user_permissions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all permissions for a user (role-based + individual)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get user role
                cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
                user_role = cursor.fetchone()
                if not user_role:
                    return []
                
                # Get role-based permissions
                cursor.execute("""
                    SELECT permission, resource FROM role_permissions 
                    WHERE role = ?
                """, (user_role[0],))
                role_permissions = [{"permission": row[0], "resource": row[1], "type": "role"} 
                                  for row in cursor.fetchall()]
                
                # Get individual permissions
                cursor.execute("""
                    SELECT permission, resource FROM user_permissions 
                    WHERE user_id = ? AND is_active = 1 
                    AND (expires_at IS NULL OR expires_at > ?)
                """, (user_id, datetime.utcnow()))
                individual_permissions = [{"permission": row[0], "resource": row[1], "type": "individual"} 
                                        for row in cursor.fetchall()]
                
                return role_permissions + individual_permissions
                
        except Exception as e:
            logger.error(f"Failed to get user permissions: {e}")
            return []

    def check_permission(self, user_id: str, permission: str, resource: str = None) -> bool:
        """Check if user has specific permission"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get user role
                cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
                user_role = cursor.fetchone()
                if not user_role:
                    return False
                
                # Check role-based permission
                if resource:
                    cursor.execute("""
                        SELECT 1 FROM role_permissions 
                        WHERE role = ? AND permission = ? AND resource = ?
                    """, (user_role[0], permission, resource))
                else:
                    cursor.execute("""
                        SELECT 1 FROM role_permissions 
                        WHERE role = ? AND permission = ?
                    """, (user_role[0], permission))
                
                if cursor.fetchone():
                    return True
                
                # Check individual permission
                if resource:
                    cursor.execute("""
                        SELECT 1 FROM user_permissions 
                        WHERE user_id = ? AND permission = ? AND resource = ? 
                        AND is_active = 1 AND (expires_at IS NULL OR expires_at > ?)
                    """, (user_id, permission, resource, datetime.utcnow()))
                else:
                    cursor.execute("""
                        SELECT 1 FROM user_permissions 
                        WHERE user_id = ? AND permission = ? 
                        AND is_active = 1 AND (expires_at IS NULL OR expires_at > ?)
                    """, (user_id, permission, datetime.utcnow()))
                
                return cursor.fetchone() is not None
                
        except Exception as e:
            logger.error(f"Failed to check permission: {e}")
            return False

    def grant_permission(self, user_id: str, permission: str, resource: str = None, 
                        granted_by: str = None, expires_at: datetime = None) -> bool:
        """Grant individual permission to user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                permission_id = f"{user_id}_{permission}_{resource or 'all'}"
                cursor.execute("""
                    INSERT OR REPLACE INTO user_permissions 
                    (id, user_id, permission, resource, granted_by, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (permission_id, user_id, permission, resource, granted_by, expires_at))
                
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Failed to grant permission: {e}")
            return False

    def revoke_permission(self, user_id: str, permission: str, resource: str = None) -> bool:
        """Revoke individual permission from user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if resource:
                    cursor.execute("""
                        DELETE FROM user_permissions 
                        WHERE user_id = ? AND permission = ? AND resource = ?
                    """, (user_id, permission, resource))
                else:
                    cursor.execute("""
                        DELETE FROM user_permissions 
                        WHERE user_id = ? AND permission = ?
                    """, (user_id, permission))
                
                conn.commit()
                return cursor.rowcount > 0
                
        except Exception as e:
            logger.error(f"Failed to revoke permission: {e}")
            return False

    def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user preferences"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT language, theme, timezone, notifications, search_preferences
                    FROM user_preferences WHERE user_id = ?
                """, (user_id,))
                
                row = cursor.fetchone()
                if not row:
                    # Return default preferences
                    return {
                        "language": "fa",
                        "theme": "light",
                        "timezone": "Asia/Tehran",
                        "notifications": {},
                        "search_preferences": {}
                    }
                
                import json
                return {
                    "language": row[0],
                    "theme": row[1],
                    "timezone": row[2],
                    "notifications": json.loads(row[3]) if row[3] else {},
                    "search_preferences": json.loads(row[4]) if row[4] else {}
                }
                
        except Exception as e:
            logger.error(f"Failed to get user preferences: {e}")
            return {}

    def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """Update user preferences"""
        try:
            import json
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT OR REPLACE INTO user_preferences 
                    (id, user_id, language, theme, timezone, notifications, search_preferences, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"prefs_{user_id}",
                    user_id,
                    preferences.get("language", "fa"),
                    preferences.get("theme", "light"),
                    preferences.get("timezone", "Asia/Tehran"),
                    json.dumps(preferences.get("notifications", {})),
                    json.dumps(preferences.get("search_preferences", {})),
                    datetime.utcnow()
                ))
                
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Failed to update user preferences: {e}")
            return False

    def log_login_attempt(self, email: str, ip_address: str, user_agent: str = None,
                         success: bool = False, failure_reason: str = None,
                         country: str = None, city: str = None):
        """Log login attempt for security monitoring"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO login_attempts 
                    (id, email, ip_address, user_agent, success, failure_reason, country, city)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"attempt_{datetime.utcnow().timestamp()}",
                    email,
                    ip_address,
                    user_agent,
                    success,
                    failure_reason,
                    country,
                    city
                ))
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to log login attempt: {e}")

    def get_security_stats(self) -> Dict[str, Any]:
        """Get security statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Total login attempts in last 24 hours
                cursor.execute("""
                    SELECT COUNT(*) FROM login_attempts 
                    WHERE timestamp > datetime('now', '-1 day')
                """)
                total_attempts = cursor.fetchone()[0]
                
                # Failed login attempts in last 24 hours
                cursor.execute("""
                    SELECT COUNT(*) FROM login_attempts 
                    WHERE timestamp > datetime('now', '-1 day') AND success = 0
                """)
                failed_attempts = cursor.fetchone()[0]
                
                # Active sessions
                cursor.execute("""
                    SELECT COUNT(*) FROM sessions 
                    WHERE is_active = 1 AND expires_at > datetime('now')
                """)
                active_sessions = cursor.fetchone()[0]
                
                # Locked accounts
                cursor.execute("""
                    SELECT COUNT(*) FROM users 
                    WHERE locked_until > datetime('now')
                """)
                locked_accounts = cursor.fetchone()[0]
                
                return {
                    "total_attempts_24h": total_attempts,
                    "failed_attempts_24h": failed_attempts,
                    "active_sessions": active_sessions,
                    "locked_accounts": locked_accounts,
                    "success_rate": (total_attempts - failed_attempts) / max(total_attempts, 1) * 100
                }
                
        except Exception as e:
            logger.error(f"Failed to get security stats: {e}")
            return {}

    def cleanup_old_data(self, days: int = 30):
        """Clean up old audit logs and login attempts"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Clean up old audit logs
                cursor.execute("""
                    DELETE FROM audit_log 
                    WHERE timestamp < datetime('now', '-{} days')
                """.format(days))
                audit_deleted = cursor.rowcount
                
                # Clean up old login attempts
                cursor.execute("""
                    DELETE FROM login_attempts 
                    WHERE timestamp < datetime('now', '-{} days')
                """.format(days))
                attempts_deleted = cursor.rowcount
                
                # Clean up expired sessions
                cursor.execute("""
                    DELETE FROM sessions 
                    WHERE expires_at < datetime('now')
                """)
                sessions_deleted = cursor.rowcount
                
                conn.commit()
                
                logger.info(f"Cleaned up {audit_deleted} audit logs, {attempts_deleted} login attempts, {sessions_deleted} expired sessions")
                
        except Exception as e:
            logger.error(f"Failed to cleanup old data: {e}")

# Global database instance
auth_db = AuthDatabase()