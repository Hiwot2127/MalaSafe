"""Service for creating and managing audit logs."""

from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request
from app.models.audit_log import AuditLog
from app.models.user import User
from loguru import logger


class AuditService:
    """Service for audit logging."""
    
    @staticmethod
    async def log(
        db: AsyncSession,
        action: str,
        resource_type: str,
        description: str,
        status: str = "success",
        actor: Optional[User] = None,
        resource_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """
        Create an audit log entry.
        
        Args:
            db: Database session
            action: Action performed (e.g., "user_created", "login_success")
            resource_type: Type of resource (e.g., "user", "upload", "system")
            description: Human-readable description
            status: "success", "failure", or "warning"
            actor: User who performed the action (None for system actions)
            resource_id: ID of the affected resource
            metadata: Additional context data
            request: FastAPI request object for IP/user agent
            
        Returns:
            Created AuditLog instance
        """
        # Extract request context
        ip_address = None
        user_agent = None
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
        
        # Create audit log
        audit_log = AuditLog(
            actor_id=actor.id if actor else None,
            actor_email=actor.email if actor else None,
            actor_role=actor.role.value if actor else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            metadata=metadata,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
        )
        
        db.add(audit_log)
        await db.commit()
        await db.refresh(audit_log)
        
        logger.info(
            f"Audit: {action} | {resource_type} | {description} | "
            f"Actor: {actor.email if actor else 'system'} | Status: {status}"
        )
        
        return audit_log
    
    @staticmethod
    async def log_login_attempt(
        db: AsyncSession,
        email: str,
        success: bool,
        reason: Optional[str] = None,
        request: Optional[Request] = None,
    ):
        """Log a login attempt."""
        action = "login_success" if success else "login_failure"
        status = "success" if success else "failure"
        description = f"Login attempt for {email}"
        if not success and reason:
            description += f": {reason}"
        
        await AuditService.log(
            db=db,
            action=action,
            resource_type="authentication",
            description=description,
            status=status,
            metadata={"email": email, "reason": reason} if reason else {"email": email},
            request=request,
        )
    
    @staticmethod
    async def log_user_created(
        db: AsyncSession,
        admin: User,
        new_user: User,
        request: Optional[Request] = None,
    ):
        """Log user creation."""
        await AuditService.log(
            db=db,
            action="user_created",
            resource_type="user",
            description=f"User {new_user.email} created with role {new_user.role.value}",
            actor=admin,
            resource_id=str(new_user.id),
            metadata={
                "new_user_email": new_user.email,
                "new_user_role": new_user.role.value,
                "new_user_id": str(new_user.id),
            },
            request=request,
        )
    
    @staticmethod
    async def log_user_updated(
        db: AsyncSession,
        admin: User,
        updated_user: User,
        changes: Dict[str, Any],
        request: Optional[Request] = None,
    ):
        """Log user update."""
        await AuditService.log(
            db=db,
            action="user_updated",
            resource_type="user",
            description=f"User {updated_user.email} updated",
            actor=admin,
            resource_id=str(updated_user.id),
            metadata={
                "updated_user_email": updated_user.email,
                "changes": changes,
            },
            request=request,
        )
    
    @staticmethod
    async def log_password_reset(
        db: AsyncSession,
        admin: User,
        target_user: User,
        request: Optional[Request] = None,
    ):
        """Log password reset."""
        await AuditService.log(
            db=db,
            action="password_reset",
            resource_type="user",
            description=f"Password reset for user {target_user.email}",
            actor=admin,
            resource_id=str(target_user.id),
            metadata={
                "target_user_email": target_user.email,
                "target_user_id": str(target_user.id),
            },
            request=request,
        )
    
    @staticmethod
    async def log_role_change(
        db: AsyncSession,
        admin: User,
        target_user: User,
        old_role: str,
        new_role: str,
        request: Optional[Request] = None,
    ):
        """Log role change."""
        await AuditService.log(
            db=db,
            action="role_changed",
            resource_type="user",
            description=f"Role changed for {target_user.email}: {old_role} → {new_role}",
            actor=admin,
            resource_id=str(target_user.id),
            metadata={
                "target_user_email": target_user.email,
                "old_role": old_role,
                "new_role": new_role,
            },
            request=request,
        )
    
    @staticmethod
    async def log_user_activation_change(
        db: AsyncSession,
        admin: User,
        target_user: User,
        is_active: bool,
        request: Optional[Request] = None,
    ):
        """Log user activation/deactivation."""
        action = "user_activated" if is_active else "user_deactivated"
        description = f"User {target_user.email} {'activated' if is_active else 'deactivated'}"
        
        await AuditService.log(
            db=db,
            action=action,
            resource_type="user",
            description=description,
            actor=admin,
            resource_id=str(target_user.id),
            metadata={
                "target_user_email": target_user.email,
                "is_active": is_active,
            },
            request=request,
        )
    
    @staticmethod
    async def log_upload(
        db: AsyncSession,
        user: User,
        upload_type: str,
        filename: str,
        record_count: int,
        upload_id: str,
        request: Optional[Request] = None,
    ):
        """Log data upload."""
        await AuditService.log(
            db=db,
            action="data_uploaded",
            resource_type="upload",
            description=f"Uploaded {upload_type}: {filename} ({record_count} records)",
            actor=user,
            resource_id=upload_id,
            metadata={
                "upload_type": upload_type,
                "filename": filename,
                "record_count": record_count,
            },
            request=request,
        )
