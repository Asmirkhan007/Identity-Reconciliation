import { Body, Controller, Post } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('identify')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post()
  async identify(@Body() body: { email?: string; phoneNumber?: string }) {
    return this.contactService.identify(body.email, body.phoneNumber);
  }
}
