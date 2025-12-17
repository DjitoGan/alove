// apps/api/src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let hint: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as any;
        message = res.message || exception.message;
        errorCode = res.errorCode || 'HTTP_ERROR';
        hint = res.hint;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack, traceId);
    }

    const errorResponse = {
      errorCode,
      message: Array.isArray(message) ? message : [message],
      hint,
      traceId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log errors (except 4xx client errors)
    if (status >= 500) {
      this.logger.error(
        `[${status}] ${request.method} ${request.url}`,
        JSON.stringify(errorResponse),
        traceId,
      );
    }

    response.status(status).json(errorResponse);
  }
}
