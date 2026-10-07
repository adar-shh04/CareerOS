import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';

interface RequestWithUser {
  user?: { id?: string };
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}

@Injectable()
export class CareerOsThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const typedReq = req as unknown as RequestWithUser;

    // If request has an authenticated user, track by unique user ID.
    // This ensures users behind a shared NAT/VPN or Next.js server-side BFF proxy
    // do not consume each other's rate limit.
    if (typedReq.user?.id) {
      return Promise.resolve(`user:${typedReq.user.id}`);
    }

    // Extract real client IP from reverse proxy headers
    const headers = typedReq.headers ?? {};
    const rawForwarded =
      headers['cf-connecting-ip'] ??
      headers['x-forwarded-for'] ??
      headers['x-real-ip'];

    if (rawForwarded) {
      const forwardedStr = Array.isArray(rawForwarded)
        ? (rawForwarded[0] ?? '')
        : rawForwarded;
      const clientIp = forwardedStr.split(',')[0]?.trim();
      if (clientIp) {
        return Promise.resolve(`ip:${clientIp}`);
      }
    }

    const ip = typedReq.ip ?? typedReq.socket?.remoteAddress ?? 'unknown';
    return Promise.resolve(`ip:${ip}`);
  }

  protected override throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const { res } = this.getRequestResponse(context);

    // Compute retry-after in whole seconds (minimum 1 second)
    const timeToWaitMs =
      throttlerLimitDetail.timeToBlockExpire > 0
        ? throttlerLimitDetail.timeToBlockExpire
        : throttlerLimitDetail.timeToExpire > 0
          ? throttlerLimitDetail.timeToExpire
          : 1000;
    const retryAfterSeconds = Math.max(1, Math.ceil(timeToWaitMs / 1000));

    this.setResponseHeader(res, 'Retry-After', retryAfterSeconds.toString());
    this.setResponseHeader(
      res,
      'X-RateLimit-Limit',
      throttlerLimitDetail.limit.toString(),
    );
    this.setResponseHeader(res, 'X-RateLimit-Remaining', '0');

    return Promise.reject(
      new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  }
}
