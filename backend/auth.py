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
        # Print debug state
        print(f"DEBUG auth: SUPABASE_JWT_SECRET is set={bool(settings.SUPABASE_JWT_SECRET)}, len={len(settings.SUPABASE_JWT_SECRET) if settings.SUPABASE_JWT_SECRET else 0}")
        
        # Check if we should try to decode with Supabase JWT secret
        if settings.SUPABASE_JWT_SECRET:
            try:
                # Supabase JWT secrets are base64-encoded. We decode them to raw bytes to verify HS256 tokens.
                import base64
                try:
                    # Pad the secret if necessary
                    padded_secret = settings.SUPABASE_JWT_SECRET
                    missing_padding = len(padded_secret) % 4
                    if missing_padding:
                        padded_secret += '=' * (4 - missing_padding)
                    secret_bytes = base64.b64decode(padded_secret)
                except Exception as e:
                    print(f"Supabase JWT base64 decode failed: {e}")
                    secret_bytes = settings.SUPABASE_JWT_SECRET.encode()

                # Supabase tokens are signed with the HS256 algorithm and the JWT secret
                payload = jwt.decode(token, secret_bytes, algorithms=["HS256"], audience="authenticated")
                return payload
            except JWTError as e:
                print(f"Supabase JWT decode failed: {e}")
                # If Supabase decoding fails, fall back to our local key
                pass
        
        # Local JWT decoding
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except JWTError as e:
            print(f"Local JWT decode failed: {e}")
            return None
    except Exception as e:
        print(f"General JWT decoding error: {e}")
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
