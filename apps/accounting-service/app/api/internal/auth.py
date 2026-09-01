"""Xác thực nội bộ bằng API key tĩnh (Mục 3.6.3 spec) — đơn giản, đủ dùng cho
giao tiếp server-to-server trong cùng mạng riêng (VPC/docker network). Nếu
2 service không cùng mạng riêng an toàn, nên nâng cấp lên mTLS."""
from fastapi import Header, HTTPException
from app.core.config import settings


def verify_internal_api_key(x_internal_api_key: str = Header(...)):
    if x_internal_api_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Internal API key không hợp lệ")
