from pydantic import BaseModel, EmailStr
from typing import Optional


class ExternalSignup(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    company: Optional[str] = None


class ExternalLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class ExternalUserOut(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True
