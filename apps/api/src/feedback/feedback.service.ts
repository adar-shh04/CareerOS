import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { ContactDto, FeedbackDto } from './feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly resend: Resend;
  constructor(private readonly config: ConfigService) { this.resend = new Resend(config.get<string>('RESEND_API_KEY')); }

  async contact(input: ContactDto) {
    if (input.website) return { accepted: true };
    return this.send(input.email, input.name, input.subject, input.message, this.config.get<string>('CONTACT_EMAIL'));
  }
  async feedback(input: FeedbackDto) {
    if (input.website) return { accepted: true };
    return this.send(input.email, input.name, `CareerOS feedback: ${input.type}`, input.message, this.config.get<string>('FEEDBACK_EMAIL'));
  }
  private async send(replyTo: string, name: string, subject: string, message: string, to?: string) {
    if (!process.env.RESEND_API_KEY || !to) throw new ServiceUnavailableException('Email delivery is not configured.');
    const { error } = await this.resend.emails.send({ from: 'CareerOS <onboarding@resend.dev>', to, replyTo, subject, text: `From: ${name} <${replyTo}>\n\n${message}` });
    if (error) throw new ServiceUnavailableException('Unable to deliver your message.');
    return { accepted: true };
  }
}
