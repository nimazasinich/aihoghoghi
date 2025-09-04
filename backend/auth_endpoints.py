"""
Iranian Legal Archive - Authentication API Endpoints
FastAPI endpoints for authentication system with Persian support
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta

from auth_service import AuthService, User, LoginCredentials, RegisterData, UserRole
from auth_database import AuthDatabase
from security.rate_limiter import rate_limiter
from security.audit_logger import audit_logger, AuditEventType, AuditLevel

logger = logging.getLogger(__name__)

# Initialize services
auth_db = AuthDatabase()
auth_service = AuthService(auth_db)
security = HTTPBearer()

# Create router
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# Pydantic models for request/response
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('رمز عبور باید حداقل ۶ کاراکتر باشد')
        return v

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "viewer"

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('رمز عبور باید حداقل ۸ کاراکتر باشد')
        if not any(c.isupper() for c in v):
            raise ValueError('رمز عبور باید حداقل یک حرف بزرگ داشته باشد')
        if not any(c.islower() for c in v):
            raise ValueError('رمز عبور باید حداقل یک حرف کوچک داشته باشد')
        if not any(c.isdigit() for c in v):
            raise ValueError('رمز عبور باید حداقل یک عدد داشته باشد')
        return v

    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('نام باید حداقل ۲ کاراکتر باشد')
        return v.strip()

    @validator('role')
    def validate_role(cls, v):
        valid_roles = ['admin', 'lawyer', 'researcher', 'viewer']
        if v not in valid_roles:
            raise ValueError(f'نقش باید یکی از موارد زیر باشد: {", ".join(valid_roles)}')
        return v

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str
    last_login: Optional[str] = None
    is_active: bool
    email_verified: bool = False

class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None
    token: Optional[str] = None
    expires_in: Optional[int] = None

class RegisterResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None

class TokenResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    expires_in: Optional[int] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('رمز عبور باید حداقل ۸ کاراکتر باشد')
        if not any(c.isupper() for c in v):
            raise ValueError('رمز عبور باید حداقل یک حرف بزرگ داشته باشد')
        if not any(c.islower() for c in v):
            raise ValueError('رمز عبور باید حداقل یک حرف کوچک داشته باشد')
        if not any(c.isdigit() for c in v):
            raise ValueError('رمز عبور باید حداقل یک عدد داشته باشد')
        return v

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user from JWT token"""
    try:
        token = credentials.credentials
        user = auth_service.verify_token(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="توکن نامعتبر است",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="توکن نامعتبر است",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Authentication endpoints
@auth_router.post("/login", response_model=LoginResponse)
@rate_limiter(requests=5, window=300)  # 5 requests per 5 minutes
async def login(request: Request, login_data: LoginRequest):
    """User login endpoint with Persian error messages"""
    try:
        # Log login attempt
        await audit_logger.log_event(
            event_type=AuditEventType.AUTHENTICATION,
            level=AuditLevel.INFO,
            user_id=None,
            details={
                "action": "login_attempt",
                "email": login_data.email,
                "ip_address": request.client.host,
                "user_agent": request.headers.get("user-agent", "")
            }
        )

        credentials = LoginCredentials(
            email=login_data.email,
            password=login_data.password
        )
        
        result = auth_service.login(credentials)
        
        if result["success"]:
            user = result["user"]
            token = result["token"]
            
            # Log successful login
            await audit_logger.log_event(
                event_type=AuditEventType.AUTHENTICATION,
                level=AuditLevel.INFO,
                user_id=user.id,
                details={
                    "action": "login_success",
                    "email": user.email,
                    "ip_address": request.client.host
                }
            )
            
            return LoginResponse(
                success=True,
                message="ورود موفقیت‌آمیز",
                user=UserResponse(
                    id=user.id,
                    email=user.email,
                    name=user.name,
                    role=user.role.value,
                    created_at=user.created_at.isoformat(),
                    last_login=user.last_login.isoformat() if user.last_login else None,
                    is_active=user.is_active,
                    email_verified=True  # TODO: Implement email verification
                ),
                token=token,
                expires_in=3600  # 1 hour
            )
        else:
            # Log failed login
            await audit_logger.log_event(
                event_type=AuditEventType.AUTHENTICATION,
                level=AuditLevel.WARNING,
                user_id=None,
                details={
                    "action": "login_failed",
                    "email": login_data.email,
                    "reason": result["message"],
                    "ip_address": request.client.host
                }
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        await audit_logger.log_event(
            event_type=AuditEventType.AUTHENTICATION,
            level=AuditLevel.ERROR,
            user_id=None,
            details={
                "action": "login_error",
                "email": login_data.email,
                "error": str(e),
                "ip_address": request.client.host
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطا در سیستم احراز هویت"
        )

@auth_router.post("/register", response_model=RegisterResponse)
@rate_limiter(requests=3, window=3600)  # 3 requests per hour
async def register(request: Request, register_data: RegisterRequest):
    """User registration endpoint with Persian validation"""
    try:
        # Log registration attempt
        await audit_logger.log_event(
            event_type=AuditEventType.AUTHENTICATION,
            level=AuditLevel.INFO,
            user_id=None,
            details={
                "action": "registration_attempt",
                "email": register_data.email,
                "ip_address": request.client.host,
                "user_agent": request.headers.get("user-agent", "")
            }
        )

        data = RegisterData(
            email=register_data.email,
            password=register_data.password,
            name=register_data.name,
            role=register_data.role
        )
        
        result = auth_service.register(data)
        
        if result["success"]:
            user = result["user"]
            
            # Log successful registration
            await audit_logger.log_event(
                event_type=AuditEventType.AUTHENTICATION,
                level=AuditLevel.INFO,
                user_id=user.id,
                details={
                    "action": "registration_success",
                    "email": user.email,
                    "role": user.role.value,
                    "ip_address": request.client.host
                }
            )
            
            return RegisterResponse(
                success=True,
                message="ثبت‌نام موفقیت‌آمیز",
                user=UserResponse(
                    id=user.id,
                    email=user.email,
                    name=user.name,
                    role=user.role.value,
                    created_at=user.created_at.isoformat(),
                    is_active=user.is_active,
                    email_verified=False
                )
            )
        else:
            # Log failed registration
            await audit_logger.log_event(
                event_type=AuditEventType.AUTHENTICATION,
                level=AuditLevel.WARNING,
                user_id=None,
                details={
                    "action": "registration_failed",
                    "email": register_data.email,
                    "reason": result["message"],
                    "ip_address": request.client.host
                }
            )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        await audit_logger.log_event(
            event_type=AuditEventType.AUTHENTICATION,
            level=AuditLevel.ERROR,
            user_id=None,
            details={
                "action": "registration_error",
                "email": register_data.email,
                "error": str(e),
                "ip_address": request.client.host
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطا در سیستم ثبت‌نام"
        )

@auth_router.post("/logout")
async def logout(request: Request, current_user: User = Depends(get_current_user)):
    """User logout endpoint"""
    try:
        # Log logout
        await audit_logger.log_event(
            event_type=AuditEventType.AUTHENTICATION,
            level=AuditLevel.INFO,
            user_id=current_user.id,
            details={
                "action": "logout",
                "email": current_user.email,
                "ip_address": request.client.host
            }
        )
        
        auth_service.logout(current_user.id)
        
        return {"success": True, "message": "خروج موفقیت‌آمیز"}
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطا در خروج از سیستم"
        )

@auth_router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role.value,
        created_at=current_user.created_at.isoformat(),
        last_login=current_user.last_login.isoformat() if current_user.last_login else None,
        is_active=current_user.is_active,
        email_verified=True  # TODO: Implement email verification
    )

@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh JWT token"""
    try:
        new_token = auth_service.refresh_token(current_user.id)
        
        if new_token:
            return TokenResponse(
                success=True,
                token=new_token,
                expires_in=3600
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="نمی‌توان توکن را تازه کرد"
            )
            
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطا در تازه کردن توکن"
        )

@auth_router.post("/forgot-password")
@rate_limiter(requests=3, window=3600)  # 3 requests per hour
async def forgot_password(request: Request, reset_data: PasswordResetRequest):
    """Request password reset"""
    try:
        # Log password reset request
        await audit_logger.log_event(
            event_type=AuditEventType.AUTHENTICATION,
            level=AuditLevel.INFO,
            user_id=None,
            details={
                "action": "password_reset_request",
                "email": reset_data.email,
                "ip_address": request.client.host
            }
        )
        
        result = auth_service.request_password_reset(reset_data.email)
        
        if result["success"]:
            return {"success": True, "message": "ایمیل بازیابی رمز عبور ارسال شد"}
        else:
            # Don't reveal if email exists or not
            return {"success": True, "message": "اگر ایمیل در سیستم موجود باشد، لینک بازیابی ارسال خواهد شد"}
            
    except Exception as e:
        logger.error(f"Password reset request error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطا در درخواست بازیابی رمز عبور"
        )

@auth_router.post("/reset-password")
@rate_limiter(requests=5, window=3600)  # 5 requests per hour
async def reset_password(request: Request, reset_data: PasswordResetConfirm):
    """Reset password with token"""
    try:
        # Log password reset attempt
        await audit_logger.log_event(
            event_type=AuditEventType.AUTHENTICATION,
            level=AuditLevel.INFO,
            user_id=None,
            details={
                "action": "password_reset_attempt",
                "ip_address": request.client.host
            }
        )
        
        result = auth_service.reset_password(reset_data.token, reset_data.new_password)
        
        if result["success"]:
            # Log successful password reset
            await audit_logger.log_event(
                event_type=AuditEventType.AUTHENTICATION,
                level=AuditLevel.INFO,
                user_id=result.get("user_id"),
                details={
                    "action": "password_reset_success",
                    "ip_address": request.client.host
                }
            )
            
            return {"success": True, "message": "رمز عبور با موفقیت تغییر یافت"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطا در تغییر رمز عبور"
        )

@auth_router.put("/profile")
async def update_profile(
    request: Request,
    profile_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Update user profile"""
    try:
        # Log profile update
        await audit_logger.log_event(
            event_type=AuditEventType.USER_ACTION,
            level=AuditLevel.INFO,
            user_id=current_user.id,
            details={
                "action": "profile_update",
                "changes": profile_data,
                "ip_address": request.client.host
            }
        )
        
        result = auth_service.update_user_profile(current_user.id, profile_data)
        
        if result["success"]:
            return {"success": True, "message": "پروفایل با موفقیت به‌روزرسانی شد"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="خطا در به‌روزرسانی پروفایل"
        )

# Health check endpoint
@auth_router.get("/health")
async def auth_health_check():
    """Authentication service health check"""
    try:
        # Test database connection
        auth_db.test_connection()
        
        return {
            "status": "healthy",
            "service": "authentication",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Auth health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="سرویس احراز هویت در دسترس نیست"
        )