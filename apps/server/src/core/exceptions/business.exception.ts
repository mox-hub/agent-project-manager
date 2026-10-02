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
  /**
   * 凭证正确，但**当前选中的工作区里没有该主体**（CAP-A-25 ⑤）。
   * 与 INVALID_CREDENTIALS 严格区分：后者是「凭证不对」，前者是「人不在这个库」——
   * 后者可行动（接受邀请 / 切换工作区），前者只能重试。
   */
  WORKSPACE_SUBJECT_MISSING = 'WORKSPACE_SUBJECT_MISSING',
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
