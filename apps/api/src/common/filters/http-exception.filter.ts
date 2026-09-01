import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

/**
 * HttpExceptionFilter — chuẩn hoá format lỗi trả về cho toàn bộ API,
 * giúp frontend xử lý lỗi nhất quán (Mục 7.2 spec: validate + error handling).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Đã có lỗi xảy ra, vui lòng thử lại sau.';

    response.status(status).json({
      success: false,
      statusCode: status,
      path: ctx.getRequest().url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
