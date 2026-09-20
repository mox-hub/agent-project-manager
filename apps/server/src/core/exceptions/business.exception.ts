import { HttpException, HttpStatus } from '@nestjs/common';

export enum ErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED',
  USER_INACTIVE = 'USER_INACTIVE',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  /** 存在未通过（failed 等非 passed/waived）的验收契约，阻断工单完成（决策卡 resolution 路径） */
  ACCEPTANCE_FAILED_BLOCKING = 'ACCEPTANCE_FAILED_BLOCKING',
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
