from typing import Optional
from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.services.auth_service import (
    PRESET_USERS,
    issue_jwt_token,
    resolve_request_actor,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TokenRequest(BaseModel):
    role: str = "researcher"


@router.get("/roles")
def list_roles():
    return {
        "status": "success",
        "roles": list(PRESET_USERS.values()),
    }


@router.post("/token")
def create_token(payload: TokenRequest):
    role_key = (payload.role or "").strip().lower()
    if role_key not in PRESET_USERS:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": f"未知角色: {payload.role}"},
        )
    preset = PRESET_USERS[role_key]
    token = issue_jwt_token(
        user_id=preset["user_id"],
        role=preset["role"],
        display_name=preset["display_name"],
    )
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": preset,
    }


@router.get("/me")
def get_current_actor(
    authorization: Optional[str] = Header(default=None),
    x_actor_role: Optional[str] = Header(default=None),
):
    actor = resolve_request_actor(authorization, x_actor_role)
    if actor["auth_mode"] == "jwt_invalid":
        return JSONResponse(
            status_code=401,
            content={"status": "error", "message": "JWT 令牌无效或已过期", "user": actor},
        )
    return {"status": "success", "user": actor}
