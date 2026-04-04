import { inject, injectable } from "inversify";
import { ServerClient } from "postmark";
import { getServerEnv } from "@photo-salon/env/server";
import { type EventContext } from "@/lib/context.ts";
import { postmarkSymbol } from "@/lib/symbols.ts";

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

@injectable()
export class EmailService {
  constructor(@inject(postmarkSymbol) private postmark: ServerClient) {}

  async send(ctx: EventContext, params: SendEmailParams): Promise<void> {
    const env = getServerEnv();
    if (!env.EMAIL_ENABLED) {
      ctx.logger.info(`[Email disabled] To: ${params.to} | Subject: ${params.subject}`);
      ctx.logger.info(`[Email content] ${params.textBody}`);
      return;
    }

    ctx.logger.info("Sending email via Postmark", params.to, params.subject);
    await this.postmark.sendEmail({
      From: env.EMAIL_FROM,
      To: params.to,
      Subject: params.subject,
      HtmlBody: params.htmlBody,
      TextBody: params.textBody,
    });
    ctx.logger.info("Email sent", params.to);
  }
}
