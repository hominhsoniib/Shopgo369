"""
Entry point FastAPI — 369 Platform Accounting & Reporting Service (Mục 3.6 spec).

⚠️ Service này KHÔNG phục vụ traffic từ Frontend/internet công khai. Chỉ nhận
request nội bộ từ NestJS Core (verify qua X-Internal-Api-Key header). Đặt sau
NestJS trong network riêng (docker network / VPC) khi deploy thật.
"""
from fastapi import FastAPI
from app.api.internal import reports, forecast

app = FastAPI(
    title="369 Platform — Accounting & Reporting Service",
    description="Python service tính P&L, dự báo doanh thu, xuất báo cáo (Mục 3.6 spec)",
    version="0.1.0",
    docs_url="/internal/docs",  # đổi path docs để không trùng ý niệm "public API docs"
)

app.include_router(reports.router)
app.include_router(forecast.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "accounting-service"}
