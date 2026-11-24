import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional

PRESET_USERS: dict[str, dict] = {
    "researcher": {
        "user_id": "researcher_01",
        "role": "researcher",
        "display_name": "临床转化研究员",
        "permissions": ["paper:analyze", "knowledge:upload", "knowledge:search"],
    },
    "reviewer": {
        "user_id": "reviewer_pi",
        "role": "reviewer",
        "display_name": "医学合规审评官 (PI)",
        "permissions": [
            "paper:analyze",
            "knowledge:upload",
            "knowledge:search",
            "knowledge:approve",
            "knowledge:reject",
        ],
    },
    "admin": {
        "user_id": "opc_admin",
        "role": "admin",
        "display_name": "OPC 平台管理员",
        "permissions": [
            "paper:analyze",
            "knowledge:upload",
            "knowledge:search",
            "knowledge:approve",
            "knowledge:reject",
            "system:admin",
        ],
    },
}


def _get_jwt_secret() -> bytes:
    secret = os.getenv("CLOUDVEIN_JWT_SECRET", "cloudvein-opc-local-jwt-secret-2026")
    return secret.encode("utf-8")


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def issue_jwt_token(
    user_id: str,
    role: str,
    display_name: str,
    ttl_seconds: int = 86400,
) -> str:
    """Issue a standard HS256 JWT token using Python stdlib hmac/hashlib."""
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "role": role,
        "name": display_name,
        "iat": now,
        "exp": now + ttl_seconds,
    }
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = hmac.new(_get_jwt_secret(), signing_input, hashlib.sha256).digest()
    return f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"


def verify_jwt_token(token: str) -> Optional[dict]:
    """Verify HS256 JWT signature and expiration; return decoded payload or None."""
    if not token or token.count(".") != 2:
        return None
    try:
        header_b64, payload_b64, sig_b64 = token.split(".", 2)
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(_get_jwt_secret(), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if not isinstance(payload, dict):
            return None
        exp = int(payload.get("exp", 0))
        if exp and exp < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def resolve_request_actor(
    authorization: Optional[str],
    x_actor_role: Optional[str],
    fallback_operator: str = "web_user",
) -> dict:
    """Resolve current user identity & RBAC role from JWT or X-Actor-Role header."""
    if authorization and authorization.strip().lower().startswith("bearer "):
        raw_token = authorization.strip()[7:].strip()
        claims = verify_jwt_token(raw_token)
        if claims and claims.get("role") in PRESET_USERS:
            role_key = claims["role"]
            preset = PRESET_USERS[role_key]
            return {
                "user_id": claims.get("sub") or preset["user_id"],
                "role": role_key,
                "display_name": claims.get("name") or preset["display_name"],
                "permissions": preset["permissions"],
                "auth_mode": "jwt",
            }
        return {
            "user_id": "invalid_token",
            "role": "guest",
            "display_name": "无效或过期令牌",
            "permissions": [],
            "auth_mode": "jwt_invalid",
        }

    role_header = (x_actor_role or "").strip().lower()
    if role_header in PRESET_USERS:
        preset = PRESET_USERS[role_header]
        return {
            "user_id": preset["user_id"],
            "role": role_header,
            "display_name": preset["display_name"],
            "permissions": preset["permissions"],
            "auth_mode": "header_role",
        }

    # Default compatibility mode when neither JWT nor X-Actor-Role is supplied
    return {
        "user_id": fallback_operator,
        "role": "reviewer",
        "display_name": "默认兼容模式",
        "permissions": PRESET_USERS["reviewer"]["permissions"],
        "auth_mode": "default_compat",
    }
