import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ContactDto, FeedbackDto } from './feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('public')
@Public()
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}
  @Post('contact') contact(@Body() dto: ContactDto) { return this.service.contact(dto); }
  @Post('feedback') feedback(@Body() dto: FeedbackDto) { return this.service.feedback(dto); }
}
