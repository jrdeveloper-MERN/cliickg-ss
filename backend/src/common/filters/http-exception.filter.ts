import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isMulterError = (exception as any)?.name === 'MulterError';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : isMulterError
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: any =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let errors: any[] = [];

    const rawMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (Array.isArray(exceptionResponse.message) ? exceptionResponse.message.join(' ') : exceptionResponse.message || exceptionResponse.error || '')
          : (exception as any)?.message || '';

    const isJsonParseError =
      status === HttpStatus.BAD_REQUEST && (
        (exception as any)?.type === 'entity.parse.failed' ||
        (exceptionResponse as any)?.type === 'entity.parse.failed' ||
        exception instanceof SyntaxError ||
        (exception as any)?.name === 'SyntaxError' ||
        /in JSON at position|JSON at position|Unexpected token.*in JSON|Unexpected end of JSON|is not valid JSON|Expected double-quoted|Expected ',' or '}'|Expected property name/i.test(rawMessage)
      );

    if (isJsonParseError) {
      message = 'Invalid request payload.';
      errors = ['Invalid request payload.'];
    } else if (isMulterError) {
      const multerCode = (exception as any)?.code;
      if (multerCode === 'LIMIT_FILE_SIZE') {
        message = 'File size exceeds maximum allowed limit of 5MB.';
      } else {
        message = (exception as any)?.message || 'File upload error.';
      }
      errors = [message];
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      message = exceptionResponse.message || exceptionResponse.error || message;
      if (Array.isArray(exceptionResponse.message)) {
        errors = exceptionResponse.message;
        message = errors[0] || message;
      }
    } else {
      // Log full unhandled exception trace server-side only
      this.logger.error(
        `Unhandled Exception: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      message = 'Internal server error';
    }

    const errorCode =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).code
        : undefined;

    response.status(status).json({
      success: false,
      statusCode: status,
      ...(errorCode ? { code: errorCode } : {}),
      message,
      errors: errors.length > 0 ? errors : [message],
    });
  }
}
