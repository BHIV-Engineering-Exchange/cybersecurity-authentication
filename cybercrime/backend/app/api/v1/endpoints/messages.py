"""
Message and notification endpoints for investigator communication
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import Message, User
from app.core.config import settings

router = APIRouter()


class MessageCreate(BaseModel):
    recipient_id: Optional[int] = None  # None for broadcast
    message_type: str = "message"  # message, announcement, notification
    subject: str
    content: str
    priority: str = "normal"  # low, normal, high, urgent
    is_broadcast: bool = False


class MessageResponse(BaseModel):
    id: int
    sender_id: Optional[int]
    recipient_id: Optional[int]
    message_type: str
    subject: str
    content: str
    is_read: bool
    is_broadcast: bool
    priority: str
    created_at: str
    read_at: Optional[str]
    sender_email: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_name: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.post("/investigators/{investigator_id}/message", response_model=MessageResponse)
async def send_message_to_investigator(
    investigator_id: int,
    message: MessageCreate,
    sender_id: Optional[int] = None,  # In production, get from authenticated user
    db: Session = Depends(get_db)
):
    """Send a message to a specific investigator"""
    # Verify recipient exists and is an investigator
    recipient = db.query(User).filter(User.id == investigator_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Investigator not found")
    
    if recipient.role != "investigator":
        raise HTTPException(status_code=400, detail="Recipient is not an investigator")
    
    # Create message
    db_message = Message(
        sender_id=sender_id,
        recipient_id=investigator_id,
        message_type=message.message_type,
        subject=message.subject,
        content=message.content,
        priority=message.priority,
        is_broadcast=False
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Get sender email if sender_id is provided
    sender_email = None
    if sender_id:
        sender = db.query(User).filter(User.id == sender_id).first()
        sender_email = sender.email if sender else None
    
    return {
        "id": db_message.id,
        "sender_id": db_message.sender_id,
        "recipient_id": db_message.recipient_id,
        "message_type": db_message.message_type,
        "subject": db_message.subject,
        "content": db_message.content,
        "is_read": db_message.is_read,
        "is_broadcast": db_message.is_broadcast,
        "priority": db_message.priority,
        "created_at": db_message.created_at.isoformat() if db_message.created_at else None,
        "read_at": db_message.read_at.isoformat() if db_message.read_at else None,
        "sender_email": sender_email,
        "recipient_email": recipient.email
    }


@router.post("/broadcast", response_model=dict)
async def broadcast_announcement(
    message: MessageCreate,
    sender_id: Optional[int] = None,  # In production, get from authenticated user
    db: Session = Depends(get_db)
):
    """Broadcast an announcement to all investigators"""
    # Get all investigators
    superadmin_email = settings.SUPERADMIN_EMAIL.lower().strip() if settings.SUPERADMIN_EMAIL else None
    query = db.query(User).filter(User.role == "investigator")
    if superadmin_email:
        query = query.filter(User.email != superadmin_email)
    investigators = query.all()
    
    if not investigators:
        raise HTTPException(status_code=404, detail="No investigators found")
    
    # Create broadcast message for each investigator
    created_count = 0
    for investigator in investigators:
        db_message = Message(
            sender_id=sender_id,
            recipient_id=investigator.id,
            message_type="announcement",
            subject=message.subject,
            content=message.content,
            priority=message.priority,
            is_broadcast=True
        )
        db.add(db_message)
        created_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Announcement broadcasted to {created_count} investigator(s)",
        "recipients": created_count
    }


@router.get("/investigators/{investigator_id}/messages", response_model=List[MessageResponse])
async def get_investigator_messages(
    investigator_id: int,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all messages for a specific investigator"""
    # Verify investigator exists
    investigator = db.query(User).filter(User.id == investigator_id).first()
    if not investigator:
        raise HTTPException(status_code=404, detail="Investigator not found")
    
    # Build query
    query = db.query(Message).filter(Message.recipient_id == investigator_id)
    
    if unread_only:
        query = query.filter(Message.is_read == False)
    
    messages = query.order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
    
    # Format response
    result = []
    for msg in messages:
        sender_email = None
        if msg.sender_id:
            sender = db.query(User).filter(User.id == msg.sender_id).first()
            sender_email = sender.email if sender else None
        
        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "recipient_id": msg.recipient_id,
            "message_type": msg.message_type,
            "subject": msg.subject,
            "content": msg.content,
            "is_read": msg.is_read,
            "is_broadcast": msg.is_broadcast,
            "priority": msg.priority,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "read_at": msg.read_at.isoformat() if msg.read_at else None,
            "sender_email": sender_email,
            "recipient_email": investigator.email,
            "recipient_name": investigator.full_name
        })
    
    return result


@router.get("/history", response_model=List[MessageResponse])
async def get_message_history(
    investigator_id: Optional[int] = None,
    message_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    """
    Get communication history sent to investigators.
    Includes direct messages and broadcast announcements already delivered to investigators.
    """
    recipient_query = db.query(User).filter(User.role == "investigator")
    recipients = recipient_query.all()
    recipient_by_id = {u.id: u for u in recipients}
    recipient_ids = list(recipient_by_id.keys())

    if not recipient_ids:
        return []

    query = db.query(Message).filter(Message.recipient_id.in_(recipient_ids))

    if investigator_id:
        query = query.filter(Message.recipient_id == investigator_id)

    if message_type:
        query = query.filter(Message.message_type == message_type)

    messages = query.order_by(Message.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for msg in messages:
        recipient = recipient_by_id.get(msg.recipient_id)
        sender_email = None
        if msg.sender_id:
            sender = db.query(User).filter(User.id == msg.sender_id).first()
            sender_email = sender.email if sender else None

        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "recipient_id": msg.recipient_id,
            "message_type": msg.message_type,
            "subject": msg.subject,
            "content": msg.content,
            "is_read": msg.is_read,
            "is_broadcast": msg.is_broadcast,
            "priority": msg.priority,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "read_at": msg.read_at.isoformat() if msg.read_at else None,
            "sender_email": sender_email,
            "recipient_email": recipient.email if recipient else None,
            "recipient_name": recipient.full_name if recipient else None,
        })

    return result


@router.patch("/messages/{message_id}/read")
async def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db)
):
    """Mark a message as read"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.is_read = True
    message.read_at = datetime.utcnow()
    db.commit()
    db.refresh(message)
    
    return {
        "success": True,
        "message": "Message marked as read",
        "message_id": message_id
    }


@router.get("/investigators/{investigator_id}/unread-count")
async def get_unread_count(
    investigator_id: int,
    db: Session = Depends(get_db)
):
    """Get count of unread messages for an investigator"""
    count = db.query(Message).filter(
        Message.recipient_id == investigator_id,
        Message.is_read == False
    ).count()
    
    return {
        "investigator_id": investigator_id,
        "unread_count": count
    }


@router.post("/investigators/{investigator_id}/reply")
async def reply_to_message(
    investigator_id: int,
    message_id: int,
    message: MessageCreate,
    db: Session = Depends(get_db)
):
    """Investigator replies to a message from superadmin"""
    # Verify investigator exists
    investigator = db.query(User).filter(User.id == investigator_id).first()
    if not investigator:
        raise HTTPException(status_code=404, detail="Investigator not found")
    
    # Get original message
    original_message = db.query(Message).filter(Message.id == message_id).first()
    if not original_message:
        raise HTTPException(status_code=404, detail="Original message not found")
    
    # Verify investigator is the recipient of original message
    if original_message.recipient_id != investigator_id:
        raise HTTPException(status_code=403, detail="You can only reply to messages sent to you")
    
    # Find superadmin (sender of original message or any superadmin)
    superadmin = None
    if original_message.sender_id:
        sender = db.query(User).filter(User.id == original_message.sender_id).first()
        if sender and sender.role == "superadmin":
            superadmin = sender
    
    # If no superadmin sender, find any superadmin
    if not superadmin:
        superadmin = db.query(User).filter(User.role == "superadmin").first()
    
    if not superadmin:
        raise HTTPException(status_code=404, detail="Superadmin not found")
    
    # Create reply message
    reply_subject = f"Re: {original_message.subject}"
    db_reply = Message(
        sender_id=investigator_id,
        recipient_id=superadmin.id,
        message_type="message",
        subject=reply_subject,
        content=message.content,
        priority=message.priority,
        is_broadcast=False
    )
    db.add(db_reply)
    db.commit()
    db.refresh(db_reply)
    
    return {
        "id": db_reply.id,
        "sender_id": db_reply.sender_id,
        "recipient_id": db_reply.recipient_id,
        "message_type": db_reply.message_type,
        "subject": db_reply.subject,
        "content": db_reply.content,
        "is_read": db_reply.is_read,
        "is_broadcast": db_reply.is_broadcast,
        "priority": db_reply.priority,
        "created_at": db_reply.created_at.isoformat() if db_reply.created_at else None,
        "read_at": db_reply.read_at.isoformat() if db_reply.read_at else None,
        "sender_email": investigator.email,
        "recipient_email": superadmin.email
    }
