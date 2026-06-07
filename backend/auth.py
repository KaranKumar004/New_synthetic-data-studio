import datetime
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from backend.config import settings
from backend.database import get_db
from backend.models import User

# Hashing Context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    try:
        # Check if we should try to decode with Supabase JWT secret
        if settings.SUPABASE_JWT_SECRET:
            try:
                # Supabase tokens are signed with the HS256 algorithm and the JWT secret
                payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
                return payload
            except JWTError:
                # If Supabase decoding fails, fall back to our local key
                pass
        
        # Local JWT decoding
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Standard claims: 'sub' (subject) represents the user ID, 'email' represents the email
    user_id = payload.get("sub")
    email = payload.get("email")
    
    if not user_id:
        # Supabase uses 'sub' for the user UID
        user_id = payload.get("sub")
        
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing user identifiers",
        )

    # Check if user exists in our local DB
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Sync user dynamically to local db if it's a valid Supabase token
        if email:
            user = User(
                id=user_id,
                email=email,
                plan="free",
                max_rows_limit=settings.FREE_LIMIT
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authenticated user record does not exist in local database",
            )
            
    return user
