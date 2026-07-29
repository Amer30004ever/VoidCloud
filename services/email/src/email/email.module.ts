import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { MailerModule } from '../mailer/mailer.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [MailerModule, PrismaModule],
  controllers: [EmailController],
})
export class EmailModule {}
