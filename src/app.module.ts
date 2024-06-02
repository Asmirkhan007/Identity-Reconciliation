import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ContactModule, PrismaModule],
})
export class AppModule {}
