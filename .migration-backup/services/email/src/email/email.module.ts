import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [MailerModule],
  controllers: [EmailController],
})
export class EmailModule {}
