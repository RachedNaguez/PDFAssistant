# from datetime import timedelta, datetime, timezone
# from typing import Annotated
# from fastapi import APIRouter, Depends, HTTPException, status
# from pydantic import BaseModel, EmailStr, Field
# from fastapi.security import OAuth2PasswordRequestForm
# from jose import jwt
# from dotenv import load_dotenv
# import os
# from api.models import User
# from api.deps import db_dependency, bcrypt_context, get_current_user

# load_dotenv()

# router = APIRouter(
#     prefix="/auth",
#     tags=["auth"],
# )

# SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
# ALGORITHM = os.getenv("AUTH_ALGORITHM")
# ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")

# class UserCreate(BaseModel):
#     username: str 
#     email: str
#     password: str 

# class Token(BaseModel):
#     access_token: str
#     token_type: str
#     user: dict
    
# def authenticate_user(username: str, password: str, db):
#     user = db.query(User).filter(User.username == username).first()
#     if not user:
#         return False
#     if not bcrypt_context.verify(password, user.hashed_password):
#         return False
#     return user

# def create_access_token(username: str, user_id: int, expires_delta: timedelta):
#     to_encode = {"sub": username, "id": user_id}
#     expires = datetime.now(timezone.utc) + expires_delta
#     to_encode.update({"exp": expires})
#     encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
#     return encoded_jwt

# @router.post("/register", status_code=status.HTTP_201_CREATED)
# async def register(db: db_dependency, create_user: UserCreate):
#     user = User(username=create_user.username, email=create_user.email, hashed_password=bcrypt_context.hash(create_user.password))
#     db.add(user)
#     db.commit()
#     db.refresh(user)
#     return user

# @router.post("/token", response_model=Token)
# async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: db_dependency):
#     user = authenticate_user(form_data.username, form_data.password, db)
#     if not user:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
#     access_token_expires = timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTES))
#     access_token = create_access_token(user.username, user.id, access_token_expires)
#     user_data = {"id": user.id, "username": user.username, "email": user.email}
#     return {"user":user_data, "access_token": access_token, "token_type": "bearer"}

# @router.get("/me")
# async def get_current_user(current_user: User = Depends(get_current_user)):
#     return current_user

# auth.py (FastAPI routes)
from datetime import timedelta, datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from dotenv import load_dotenv
import os
from api.models import User
from api.deps import db_dependency, bcrypt_context, get_current_user

load_dotenv()

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
ALGORITHM = os.getenv("AUTH_ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")

class UserCreate(BaseModel):
    username: str 
    email: str
    password: str 

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict
    
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    
def authenticate_user(username: str, password: str, db):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False
    if not bcrypt_context.verify(password, user.hashed_password):
        return False
    return user

def create_access_token(username: str, user_id: int, expires_delta: timedelta):
    to_encode = {"sub": username, "id": user_id}
    expires = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expires})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(db: db_dependency, create_user: UserCreate):
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == create_user.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
        
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == create_user.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    user = User(
        username=create_user.username,
        email=create_user.email,
        hashed_password=bcrypt_context.hash(create_user.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created successfully"}

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: db_dependency
):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTES))
    access_token = create_access_token(user.username, user.id, access_token_expires)
    user_data = {"id": user.id, "username": user.username, "email": user.email}
    return {"user": user_data, "access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(db: db_dependency, current_user: dict = Depends(get_current_user)):
    user = db.query(User).filter(User.id == current_user["id"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user