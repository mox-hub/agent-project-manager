/**
 * Mail Service - Outbox 模式邮件通道
 * 所有外发邮件先落库（MailOutbox）；配置 SMTP 后真实发送，未配置则保持
 * pending 状态供管理端查看/复制（本地部署无 SMTP 也能全流程跑通）。
 */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as nodemailer from 'nodemailer';

import { PrismaService } from '@/core/database/prisma.service';
import { ConfigService } from '@/core/config/config.service';

export interface SendMailInput {
  to: string;
  subject: string;
  body: string;
  template?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private smtpConfigured(): boolean {
    return Boolean(this.config.get('MAIL_SMTP_HOST'));
  }

  private getTransporter(): nodemailer.Transporter | null {
    if (!this.smtpConfigured()) return null;
    if (this.transporter) return this.transporter;
    this.transporter = nodemailer.createTransport({
      host: this.config.get('MAIL_SMTP_HOST') as string,
      port: Number(this.config.get('MAIL_SMTP_PORT') ?? 587),
      secure: Number(this.config.get('MAIL_SMTP_PORT') ?? 587) === 465,
      auth: this.config.get('MAIL_SMTP_USER')
        ? {
            user: this.config.get('MAIL_SMTP_USER') as string,
            pass: (this.config.get('MAIL_SMTP_PASS') ?? '') as string,
          }
        : undefined,
    });
    return this.transporter;
  }

  async send(input: SendMailInput) {
    const record = await this.prisma.mailOutbox.create({
      data: {
        to: input.to,
        subject: input.subject,
        body: input.body,
        template: input.template ?? null,
        payload: input.payload as Prisma.InputJsonValue | undefined,
        status: 'pending',
      },
    });

    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.log(
        `SMTP 未配置，邮件 ${input.template ?? ''} 落 Outbox 等待查看: ${input.to}`,
      );
      return record;
    }

    try {
      await transporter.sendMail({
        from: (this.config.get('MAIL_FROM') ??
          'APM <no-reply@apm.local>') as string,
        to: input.to,
        subject: input.subject,
        html: input.body,
      });
      return this.prisma.mailOutbox.update({
        where: { id: record.id },
        data: { status: 'sent', sentAt: new Date() },
      });
    } catch (e) {
      this.logger.warn(
        `SMTP 发送失败（保留 Outbox 记录）: ${(e as Error).message}`,
      );
      return this.prisma.mailOutbox.update({
        where: { id: record.id },
        data: { status: 'failed', error: (e as Error).message.slice(0, 500) },
      });
    }
  }

  /** 团队邀请邮件 */
  async sendTeamInvite(params: {
    to: string;
    teamName: string;
    inviterName: string;
    role: string;
    token: string;
  }) {
    const baseUrl = (this.config.get('APP_PUBLIC_URL') ??
      'http://localhost:5173') as string;
    const link = `${baseUrl.replace(/\/$/, '')}/invite/${params.token}`;
    const body = `
      <h2>加入团队「${params.teamName}」</h2>
      <p>${params.inviterName} 邀请你以「${params.role}」身份加入 APM 团队「${params.teamName}」。</p>
      <p>点击以下链接接受邀请（过期前有效）：</p>
      <p><a href="${link}">${link}</a></p>
      <p>如果你没有账号，可先通过该链接注册。</p>
    `;
    return this.send({
      to: params.to,
      subject: `[APM] 邀请你加入团队「${params.teamName}」`,
      body,
      template: 'team_invite',
      payload: { link, teamName: params.teamName, role: params.role },
    });
  }

  /** 全局注册邀请邮件 */
  async sendRegisterInvite(params: {
    to: string;
    inviterName: string;
    token: string;
    expiresAt: Date;
  }) {
    const baseUrl = (this.config.get('APP_PUBLIC_URL') ??
      'http://localhost:5173') as string;
    const link = `${baseUrl.replace(/\/$/, '')}/register?invite=${params.token}`;
    const body = `
      <h2>注册 APM 账号</h2>
      <p>${params.inviterName} 邀请你注册 APM（Agent Project Manager）账号。</p>
      <p>点击以下链接完成注册（${params.expiresAt.toLocaleString('zh-CN')} 前有效）：</p>
      <p><a href="${link}">${link}</a></p>
    `;
    return this.send({
      to: params.to,
      subject: `[APM] ${params.inviterName} 邀请你注册账号`,
      body,
      template: 'register_invite',
      payload: { link },
    });
  }

  listOutbox(query?: { status?: string; limit?: number; offset?: number }) {
    const where = query?.status ? { status: query.status } : {};
    return this.prisma.mailOutbox.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query?.limit ?? 50,
      skip: query?.offset ?? 0,
    });
  }

  getSmtpStatus() {
    return { smtpConfigured: this.smtpConfigured() };
  }
}
