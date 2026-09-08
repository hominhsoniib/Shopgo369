"""Xác thực nội bộ bằng API key tĩnh (Mục 3.6.3 spec) — đơn giản, đủ dùng cho
giao tiếp server-to-server trong cùng mạng riêng (VPC/docker network). Nếu
2 service không cùng mạng riêng an toàn, nên nâng cấp lên mTLS."""
import hmac
from fastapi import Header, HTTPException
from app.core.config import settings

DEFAULT_INTERNAL_API_KEY = "change-me-internal-api-key"


def verify_internal_api_key(x_internal_api_key: str = Header(...)):
    # finding mới (soi khi audit toàn bộ): nếu vẫn dùng giá trị mặc định công khai trong mã
    # nguồn (chưa đổi qua .env) ở production, bất kỳ ai đọc được repo cũng gọi thẳng được API
    # nội bộ — chặn cứng, giống pattern seed.ts bên NestJS đã áp dụng cho SEED_ADMIN_PASSWORD.
    if settings.internal_api_key == DEFAULT_INTERNAL_API_KEY and settings.env == "production":
        raise HTTPException(
            status_code=500,
            detail="INTERNAL_API_KEY chưa được cấu hình ở production — từ chối xử lý request nội bộ",
        )
    # finding mới: so sánh bằng != là timing-unsafe — dùng hmac.compare_digest (constant-time).
    if not hmac.compare_digest(x_internal_api_key, settings.internal_api_key):
        raise HTTPException(status_code=401, detail="Internal API key không hợp lệ")
