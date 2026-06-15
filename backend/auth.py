import datetime
import urllib.request
import json
import base64
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk, JWTError
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

# JWKS cache for Supabase public keys (especially ES256)
_jwks_cache = {}

def get_supabase_jwk(kid: str) -> Optional[dict]:
    global _jwks_cache
    if kid in _jwks_cache:
        return _jwks_cache[kid]
    
    url = f"{settings.SUPABASE_URL or 'https://drdhdaawvtpzmjvczewr.supabase.co'}/auth/v1/.well-known/jwks.json"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            jwks = json.loads(response.read().decode())
            for key in jwks.get("keys", []):
                _jwks_cache[key["kid"]] = key
    except Exception as e:
        print(f"DEBUG auth: Error fetching Supabase JWKS from {url}: {e}")
        
    return _jwks_cache.get(kid)

def decode_token(token: str) -> Optional[dict]:
    try:
        # Get unverified header to check alg and kid
        alg = None
        kid = None
        try:
            header = jwt.get_unverified_header(token)
            alg = header.get("alg")
            kid = header.get("kid")
            print(f"DEBUG auth: Incoming token header: {header}")
        except Exception as e:
            print(f"DEBUG auth: Failed to read token header: {e}")

        # 1. Try Supabase verification if kid is present and alg is ES256
        if kid and alg == "ES256":
            try:
                jwk_data = get_supabase_jwk(kid)
                if jwk_data:
                    key = jwk.construct(jwk_data)
                    payload = jwt.decode(token, key, algorithms=["ES256"], audience="authenticated")
                    return payload
                else:
                    print(f"DEBUG auth: No matching JWK found for kid={kid}")
            except JWTError as e:
                print(f"DEBUG auth: Supabase ES256 verification failed: {e}")

        # 2. Fallback to HS256 using SUPABASE_JWT_SECRET if alg is HS256
        if settings.SUPABASE_JWT_SECRET and alg == "HS256":
            try:
                try:
                    padded_secret = settings.SUPABASE_JWT_SECRET
                    missing_padding = len(padded_secret) % 4
                    if missing_padding:
                        padded_secret += '=' * (4 - missing_padding)
                    secret_bytes = base64.b64decode(padded_secret)
                except Exception as e:
                    secret_bytes = settings.SUPABASE_JWT_SECRET.encode()
                
                payload = jwt.decode(token, secret_bytes, algorithms=["HS256"], audience="authenticated")
                return payload
            except JWTError as e:
                print(f"DEBUG auth: Supabase HS256 verification failed: {e}")

        # 3. Fallback to Local JWT decoding (HS256 using local SECRET_KEY)
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
