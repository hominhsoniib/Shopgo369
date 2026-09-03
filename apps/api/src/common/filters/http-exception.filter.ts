import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * HttpExceptionFilter — chuẩn hoá format lỗi trả về cho toàn bộ API,
 * giúp frontend xử lý lỗi nhất quán (Mục 7.2 spec: validate + error handling).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Đã có lỗi xảy ra, vui lòng thử lại sau.';

    // ★ BUG ĐÃ SỬA: filter cũ nuốt MỌI lỗi không phải HttpException hoàn toàn
    // im lặng (không log gì) — khiến lỗi 500 thật không để lại dấu vết nào
    // trên console server, không thể debug được. Giờ log đầy đủ stack trace
    // cho lỗi không xác định (status 500), để lỗi nghiệp vụ (400/401/403...)
    // không bị log rác (những lỗi đó đã hiển thị rõ message cho client rồi).
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${ctx.getRequest().method} ${ctx.getRequest().url} → 500: ${(exception as Error)?.message ?? exception}`,
        (exception as Error)?.stack,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      path: ctx.getRequest().url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
