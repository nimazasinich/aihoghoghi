"""
Iranian Legal Archive - Authentication Service
Comprehensive JWT-based authentication system with Persian support
"""

import jwt
import bcrypt
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
import sqlite3
import json
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UserRole(Enum):
    ADMIN = "admin"
    LAWYER = "lawyer"
    RESEARCHER = "researcher"
    VIEWER = "viewer"

@dataclass
class User:
    id: str
    email: str
    name: str
    role: UserRole
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None

@dataclass
class LoginCredentials:
    email: str
    password: str

@dataclass
class RegisterData:
    email: str
    password: str
    name: str
    role: str = "viewer"

@dataclass
class AuthResponse:
    success: bool
    message: str
    token: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None

class AuthService:
    def __init__(self, db_path: str = "auth.db", secret_key: Optional[str] = None):
        self.db_path = db_path
        self.secret_key = secret_key or self._generate_secret_key()
        self.algorithm = "HS256"
        self.token_expiry = timedelta(hours=24)
        self.refresh_token_expiry = timedelta(days=30)
        self.max_login_attempts = 5
        self.lockout_duration = timedelta(minutes=30)
        
        self._init_database()
        self._create_default_admin()

    def _generate_secret_key(self) -> str:
        """Generate a secure secret key for JWT signing"""
        return secrets.token_urlsafe(32)

    def _init_database(self):
        """Initialize the authentication database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create users table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        email TEXT UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT NOT NULL,
                        created_at TIMESTAMP NOT NULL,
                        last_login TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1,
                        failed_login_attempts INTEGER DEFAULT 0,
                        locked_until TIMESTAMP
                    )
                """)
                
                # Create sessions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        token_hash TEXT NOT NULL,
                        created_at TIMESTAMP NOT NULL,
                        expires_at TIMESTAMP NOT NULL,
                        is_active BOOLEAN DEFAULT 1,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                """)
                
                # Create audit_log table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS audit_log (
                        id TEXT PRIMARY KEY,
                        user_id TEXT,
                        action TEXT NOT NULL,
                        resource TEXT,
                        timestamp TIMESTAMP NOT NULL,
                        ip_address TEXT,
                        user_agent TEXT,
                        details TEXT
                    )
                """)
                
                # Create indexes for performance
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)")
                
                conn.commit()
                logger.info("Authentication database initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize authentication database: {e}")
            raise

    def _create_default_admin(self):
        """Create default admin user if no users exist"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM users")
                user_count = cursor.fetchone()[0]
                
                if user_count == 0:
                    admin_password = "admin123!@#"
                    password_hash = self._hash_password(admin_password)
                    
                    cursor.execute("""
                        INSERT INTO users (id, email, name, password_hash, role, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        secrets.token_urlsafe(16),
                        "admin@iranian-legal-archive.ir",
                        "مدیر سیستم",
                        password_hash,
                        UserRole.ADMIN.value,
                        datetime.utcnow()
                    ))
                    
                    conn.commit()
                    logger.info("Default admin user created: admin@iranian-legal-archive.ir / admin123!@#")
                    
        except Exception as e:
            logger.error(f"Failed to create default admin user: {e}")

    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

    def _generate_token(self, user_id: str, user_role: str, is_refresh: bool = False) -> str:
        """Generate JWT token"""
        now = datetime.utcnow()
        expiry = now + (self.refresh_token_expiry if is_refresh else self.token_expiry)
        
        payload = {
            'user_id': user_id,
            'role': user_role,
            'iat': now,
            'exp': expiry,
            'type': 'refresh' if is_refresh else 'access'
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def _verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None

    def _is_user_locked(self, user: User) -> bool:
        """Check if user account is locked"""
        if user.locked_until and user.locked_until > datetime.utcnow():
            return True
        return False

    def _lock_user(self, user_id: str):
        """Lock user account due to failed login attempts"""
        lockout_until = datetime.utcnow() + self.lockout_duration
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users 
                SET failed_login_attempts = ?, locked_until = ?
                WHERE id = ?
            """, (self.max_login_attempts, lockout_until, user_id))
            conn.commit()

    def _reset_failed_attempts(self, user_id: str):
        """Reset failed login attempts for user"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users 
                SET failed_login_attempts = 0, locked_until = NULL
                WHERE id = ?
            """, (user_id,))
            conn.commit()

    def _log_audit_event(self, user_id: Optional[str], action: str, resource: str = None, 
                        ip_address: str = None, user_agent: str = None, details: Dict = None):
        """Log audit event"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO audit_log (id, user_id, action, resource, timestamp, ip_address, user_agent, details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    secrets.token_urlsafe(16),
                    user_id,
                    action,
                    resource,
                    datetime.utcnow(),
                    ip_address,
                    user_agent,
                    json.dumps(details) if details else None
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")

    def register_user(self, register_data: RegisterData, ip_address: str = None) -> AuthResponse:
        """Register a new user"""
        try:
            # Validate email format
            if not self._is_valid_email(register_data.email):
                return AuthResponse(
                    success=False,
                    message="فرمت ایمیل نامعتبر است"
                )
            
            # Validate password strength
            if not self._is_strong_password(register_data.password):
                return AuthResponse(
                    success=False,
                    message="رمز عبور باید حداقل 8 کاراکتر و شامل حروف، اعداد و نمادها باشد"
                )
            
            # Validate role
            try:
                role = UserRole(register_data.role)
            except ValueError:
                return AuthResponse(
                    success=False,
                    message="نقش کاربری نامعتبر است"
                )
            
            # Check if user already exists
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE email = ?", (register_data.email,))
                if cursor.fetchone():
                    return AuthResponse(
                        success=False,
                        message="کاربری با این ایمیل قبلاً ثبت شده است"
                    )
                
                # Create new user
                user_id = secrets.token_urlsafe(16)
                password_hash = self._hash_password(register_data.password)
                
                cursor.execute("""
                    INSERT INTO users (id, email, name, password_hash, role, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    register_data.email,
                    register_data.name,
                    password_hash,
                    role.value,
                    datetime.utcnow()
                ))
                
                conn.commit()
                
                # Log registration
                self._log_audit_event(
                    user_id=user_id,
                    action="user_registered",
                    resource="user",
                    ip_address=ip_address,
                    details={"email": register_data.email, "role": role.value}
                )
                
                return AuthResponse(
                    success=True,
                    message="کاربر با موفقیت ثبت شد"
                )
                
        except Exception as e:
            logger.error(f"Registration failed: {e}")
            return AuthResponse(
                success=False,
                message="خطا در ثبت کاربر"
            )

    def login_user(self, credentials: LoginCredentials, ip_address: str = None, 
                   user_agent: str = None) -> AuthResponse:
        """Authenticate user and return JWT token"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, email, name, password_hash, role, created_at, last_login,
                           is_active, failed_login_attempts, locked_until
                    FROM users WHERE email = ?
                """, (credentials.email,))
                
                user_data = cursor.fetchone()
                if not user_data:
                    self._log_audit_event(
                        user_id=None,
                        action="login_failed",
                        resource="user",
                        ip_address=ip_address,
                        user_agent=user_agent,
                        details={"email": credentials.email, "reason": "user_not_found"}
                    )
                    return AuthResponse(
                        success=False,
                        message="ایمیل یا رمز عبور اشتباه است"
                    )
                
                user = User(
                    id=user_data[0],
                    email=user_data[1],
                    name=user_data[2],
                    role=UserRole(user_data[4]),
                    created_at=datetime.fromisoformat(user_data[5]),
                    last_login=datetime.fromisoformat(user_data[6]) if user_data[6] else None,
                    is_active=bool(user_data[7]),
                    failed_login_attempts=user_data[8],
                    locked_until=datetime.fromisoformat(user_data[9]) if user_data[9] else None
                )
                
                # Check if user is active
                if not user.is_active:
                    return AuthResponse(
                        success=False,
                        message="حساب کاربری غیرفعال است"
                    )
                
                # Check if user is locked
                if self._is_user_locked(user):
                    return AuthResponse(
                        success=False,
                        message=f"حساب کاربری تا {user.locked_until.strftime('%Y-%m-%d %H:%M')} قفل است"
                    )
                
                # Verify password
                if not self._verify_password(credentials.password, user_data[3]):
                    # Increment failed attempts
                    new_attempts = user.failed_login_attempts + 1
                    cursor.execute("""
                        UPDATE users SET failed_login_attempts = ? WHERE id = ?
                    """, (new_attempts, user.id))
                    
                    # Lock user if max attempts reached
                    if new_attempts >= self.max_login_attempts:
                        self._lock_user(user.id)
                        conn.commit()
                        self._log_audit_event(
                            user_id=user.id,
                            action="account_locked",
                            resource="user",
                            ip_address=ip_address,
                            user_agent=user_agent,
                            details={"reason": "max_failed_attempts"}
                        )
                        return AuthResponse(
                            success=False,
                            message="حساب کاربری به دلیل تلاش‌های ناموفق قفل شد"
                        )
                    
                    conn.commit()
                    self._log_audit_event(
                        user_id=user.id,
                        action="login_failed",
                        resource="user",
                        ip_address=ip_address,
                        user_agent=user_agent,
                        details={"reason": "invalid_password"}
                    )
                    return AuthResponse(
                        success=False,
                        message="ایمیل یا رمز عبور اشتباه است"
                    )
                
                # Successful login - reset failed attempts and update last login
                self._reset_failed_attempts(user.id)
                cursor.execute("""
                    UPDATE users SET last_login = ? WHERE id = ?
                """, (datetime.utcnow(), user.id))
                
                # Generate tokens
                access_token = self._generate_token(user.id, user.role.value)
                refresh_token = self._generate_token(user.id, user.role.value, is_refresh=True)
                
                # Store session
                session_id = secrets.token_urlsafe(16)
                cursor.execute("""
                    INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    session_id,
                    user.id,
                    self._hash_password(refresh_token),
                    datetime.utcnow(),
                    datetime.utcnow() + self.refresh_token_expiry
                ))
                
                conn.commit()
                
                # Log successful login
                self._log_audit_event(
                    user_id=user.id,
                    action="login_success",
                    resource="user",
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                return AuthResponse(
                    success=True,
                    message="ورود موفقیت‌آمیز",
                    token=access_token,
                    user={
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                        "role": user.role.value
                    },
                    expires_at=datetime.utcnow() + self.token_expiry
                )
                
        except Exception as e:
            logger.error(f"Login failed: {e}")
            return AuthResponse(
                success=False,
                message="خطا در ورود"
            )

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return user info"""
        payload = self._verify_token(token)
        if not payload:
            return None
        
        # Check if token is access token
        if payload.get('type') != 'access':
            return None
        
        # Get user info
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, email, name, role, is_active
                    FROM users WHERE id = ?
                """, (payload['user_id'],))
                
                user_data = cursor.fetchone()
                if not user_data or not user_data[4]:  # is_active
                    return None
                
                return {
                    "user_id": user_data[0],
                    "email": user_data[1],
                    "name": user_data[2],
                    "role": user_data[3]
                }
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return None

    def refresh_token(self, refresh_token: str) -> Optional[str]:
        """Generate new access token from refresh token"""
        payload = self._verify_token(refresh_token)
        if not payload or payload.get('type') != 'refresh':
            return None
        
        # Verify refresh token exists in sessions
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id FROM sessions 
                    WHERE user_id = ? AND expires_at > ? AND is_active = 1
                """, (payload['user_id'], datetime.utcnow()))
                
                if not cursor.fetchone():
                    return None
                
                # Generate new access token
                return self._generate_token(payload['user_id'], payload['role'])
                
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return None

    def logout_user(self, token: str, user_id: str):
        """Logout user and invalidate session"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE sessions SET is_active = 0 
                    WHERE user_id = ? AND is_active = 1
                """, (user_id,))
                conn.commit()
                
                self._log_audit_event(
                    user_id=user_id,
                    action="logout",
                    resource="user"
                )
                
        except Exception as e:
            logger.error(f"Logout failed: {e}")

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, email, name, role, created_at, last_login,
                           is_active, failed_login_attempts, locked_until
                    FROM users WHERE id = ?
                """, (user_id,))
                
                user_data = cursor.fetchone()
                if not user_data:
                    return None
                
                return User(
                    id=user_data[0],
                    email=user_data[1],
                    name=user_data[2],
                    role=UserRole(user_data[3]),
                    created_at=datetime.fromisoformat(user_data[4]),
                    last_login=datetime.fromisoformat(user_data[5]) if user_data[5] else None,
                    is_active=bool(user_data[6]),
                    failed_login_attempts=user_data[7],
                    locked_until=datetime.fromisoformat(user_data[8]) if user_data[8] else None
                )
        except Exception as e:
            logger.error(f"Failed to get user: {e}")
            return None

    def get_all_users(self, limit: int = 100, offset: int = 0) -> List[User]:
        """Get all users with pagination"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, email, name, role, created_at, last_login,
                           is_active, failed_login_attempts, locked_until
                    FROM users 
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """, (limit, offset))
                
                users = []
                for user_data in cursor.fetchall():
                    users.append(User(
                        id=user_data[0],
                        email=user_data[1],
                        name=user_data[2],
                        role=UserRole(user_data[3]),
                        created_at=datetime.fromisoformat(user_data[4]),
                        last_login=datetime.fromisoformat(user_data[5]) if user_data[5] else None,
                        is_active=bool(user_data[6]),
                        failed_login_attempts=user_data[7],
                        locked_until=datetime.fromisoformat(user_data[8]) if user_data[8] else None
                    ))
                
                return users
        except Exception as e:
            logger.error(f"Failed to get users: {e}")
            return []

    def update_user_role(self, user_id: str, new_role: str, admin_user_id: str) -> bool:
        """Update user role (admin only)"""
        try:
            # Validate role
            try:
                role = UserRole(new_role)
            except ValueError:
                return False
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE users SET role = ? WHERE id = ?
                """, (role.value, user_id))
                
                if cursor.rowcount == 0:
                    return False
                
                conn.commit()
                
                self._log_audit_event(
                    user_id=admin_user_id,
                    action="role_updated",
                    resource="user",
                    details={"target_user_id": user_id, "new_role": role.value}
                )
                
                return True
        except Exception as e:
            logger.error(f"Failed to update user role: {e}")
            return False

    def deactivate_user(self, user_id: str, admin_user_id: str) -> bool:
        """Deactivate user account (admin only)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE users SET is_active = 0 WHERE id = ?
                """, (user_id,))
                
                if cursor.rowcount == 0:
                    return False
                
                # Deactivate all sessions
                cursor.execute("""
                    UPDATE sessions SET is_active = 0 WHERE user_id = ?
                """, (user_id,))
                
                conn.commit()
                
                self._log_audit_event(
                    user_id=admin_user_id,
                    action="user_deactivated",
                    resource="user",
                    details={"target_user_id": user_id}
                )
                
                return True
        except Exception as e:
            logger.error(f"Failed to deactivate user: {e}")
            return False

    def _is_valid_email(self, email: str) -> bool:
        """Validate email format"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    def _is_strong_password(self, password: str) -> bool:
        """Validate password strength"""
        if len(password) < 8:
            return False
        
        has_letter = any(c.isalpha() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
        
        return has_letter and has_digit and has_special

    def get_audit_logs(self, user_id: str = None, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get audit logs (admin only)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if user_id:
                    cursor.execute("""
                        SELECT id, user_id, action, resource, timestamp, ip_address, user_agent, details
                        FROM audit_log 
                        WHERE user_id = ?
                        ORDER BY timestamp DESC
                        LIMIT ? OFFSET ?
                    """, (user_id, limit, offset))
                else:
                    cursor.execute("""
                        SELECT id, user_id, action, resource, timestamp, ip_address, user_agent, details
                        FROM audit_log 
                        ORDER BY timestamp DESC
                        LIMIT ? OFFSET ?
                    """, (limit, offset))
                
                logs = []
                for log_data in cursor.fetchall():
                    logs.append({
                        "id": log_data[0],
                        "user_id": log_data[1],
                        "action": log_data[2],
                        "resource": log_data[3],
                        "timestamp": log_data[4],
                        "ip_address": log_data[5],
                        "user_agent": log_data[6],
                        "details": json.loads(log_data[7]) if log_data[7] else None
                    })
                
                return logs
        except Exception as e:
            logger.error(f"Failed to get audit logs: {e}")
            return []

    def cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    DELETE FROM sessions WHERE expires_at < ?
                """, (datetime.utcnow(),))
                
                deleted_count = cursor.rowcount
                conn.commit()
                
                if deleted_count > 0:
                    logger.info(f"Cleaned up {deleted_count} expired sessions")
                    
        except Exception as e:
            logger.error(f"Failed to cleanup expired sessions: {e}")

# Global auth service instance
auth_service = AuthService()