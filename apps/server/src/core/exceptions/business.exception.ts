import { HttpException, HttpStatus } from '@nestjs/common';

export enum ErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_INACTIVE = 'USER_INACTIVE',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code: errorCode,
        message,
      },
      statusCode,
    );
  }
}
