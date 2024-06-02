import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Contact } from '@prisma/client';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async identify(email?: string, phoneNumber?: string) {
    try {
      // Case (iii): Return error if both email and phoneNumber are null
      if (!email && !phoneNumber) {
        throw new Error('Both email and phone number cannot be null');
      }

      if (!email || !phoneNumber) {
        return await this.handleNullEmailOrPhoneNumber(email, phoneNumber);
      }

      const contacts = await this.findContactsByEmailOrPhone(email, phoneNumber);

      // Case (i): Create a new primary contact if no contacts found
      if (contacts.length === 0) {
        return await this.createPrimaryContact(email, phoneNumber);
      }

      let primaryContact = await this.getOrCreatePrimaryContact(contacts);

      const allContacts = await this.collectLinkedContacts(primaryContact);
      const secondaryContacts = this.filterSecondaryContacts(allContacts, primaryContact);

      await this.addNewSecondaryContactIfNeeded(email, phoneNumber, contacts, primaryContact, secondaryContacts);

      await this.updatePrimaryToSecondaryIfNeeded(email, phoneNumber, contacts, primaryContact, secondaryContacts);

      return this.formatResponse(primaryContact, secondaryContacts);
    } catch (error) {
      return { error: error.message };
    }
  }

  private async handleNullEmailOrPhoneNumber(email?: string, phoneNumber?: string) {
    try {
      let contacts = [];
      if (email) {
        contacts = await this.prisma.contact.findMany({
          where: { email },
        });
      } else if (phoneNumber) {
        contacts = await this.prisma.contact.findMany({
          where: { phoneNumber },
        });
      }

      if (contacts.length === 0) {
        throw new Error('No contacts found with the provided email or phone number');
      }

      const primaryContact = await this.getPrimaryContact(contacts[0]);
      const allContacts = await this.collectLinkedContacts(primaryContact);
      const secondaryContacts = this.filterSecondaryContacts(allContacts, primaryContact);
      return this.formatResponse(primaryContact, secondaryContacts);
    } catch (error) {
      return { error: error.message };
    }
  }

  private async findContactsByEmailOrPhone(email?: string, phoneNumber?: string) {
    try {
      return await this.prisma.contact.findMany({
        where: {
          OR: [{ email }, { phoneNumber }],
        },
      });
    } catch (error) {
      throw new Error('Error fetching contacts by email or phone');
    }
  }

  private async createPrimaryContact(email: string, phoneNumber: string) {
    try {
      const newContact = await this.prisma.contact.create({
        data: { email, phoneNumber, linkPrecedence: 'primary' },
      });
      return this.formatResponse(newContact, []);
    } catch (error) {
      throw new Error('Error creating primary contact');
    }
  }

  private async getOrCreatePrimaryContact(contacts: Contact[]) {
    try {
      let primaryContact = contacts.find(contact => contact.linkPrecedence === 'primary');

      if (!primaryContact) {
        primaryContact = await this.getPrimaryContact(contacts[0]);

        primaryContact = await this.prisma.contact.update({
          where: { id: primaryContact.id },
          data: { linkPrecedence: 'primary', linkedId: null },
        });
      } else {
        primaryContact = await this.prisma.contact.findUnique({
          where: { id: primaryContact.id },
        });
      }

      return primaryContact;
    } catch (error) {
      throw new Error('Error getting or creating primary contact');
    }
  }

  private async getPrimaryContact(contact: Contact): Promise<Contact> {
    try {
      while (contact.linkedId) {
        contact = await this.prisma.contact.findUnique({
          where: { id: contact.linkedId },
        });
      }
      return contact;
    } catch (error) {
      throw new Error('Error getting primary contact');
    }
  }

  private async collectLinkedContacts(primaryContact: Contact) {
    try {
      const visited = new Set<number>();
      const queue = [primaryContact.id];
      const allContacts = [primaryContact];

      while (queue.length) {
        const currentId = queue.shift();
        if (!visited.has(currentId)) {
          visited.add(currentId);
          const linkedContacts = await this.prisma.contact.findMany({
            where: { linkedId: currentId },
          });
          linkedContacts.forEach(contact => {
            if (!visited.has(contact.id)) {
              queue.push(contact.id);
              allContacts.push(contact);
            }
          });
        }
      }

      await this.collectContactsByEmailOrPhone(primaryContact, visited, allContacts);

      return allContacts;
    } catch (error) {
      throw new Error('Error collecting linked contacts');
    }
  }

  private async collectContactsByEmailOrPhone(primaryContact: Contact, visited: Set<number>, allContacts: Contact[]) {
    try {
      const emailContacts = await this.prisma.contact.findMany({
        where: { email: primaryContact.email },
      });
      emailContacts.forEach(contact => {
        if (!visited.has(contact.id)) {
          visited.add(contact.id);
          allContacts.push(contact);
        }
      });

      const phoneContacts = await this.prisma.contact.findMany({
        where: { phoneNumber: primaryContact.phoneNumber },
      });
      phoneContacts.forEach(contact => {
        if (!visited.has(contact.id)) {
          visited.add(contact.id);
          allContacts.push(contact);
        }
      });
    } catch (error) {
      throw new Error('Error collecting contacts by email or phone');
    }
  }

  private filterSecondaryContacts(allContacts: Contact[], primaryContact: Contact) {
    return allContacts.filter(contact => contact.id !== primaryContact.id);
  }

  private async addNewSecondaryContactIfNeeded(email: string, phoneNumber: string, contacts: Contact[], primaryContact: Contact, secondaryContacts: Contact[]) {
    try {
      const existingEmail = contacts.some(contact => contact.email === email);
      const existingPhoneNumber = contacts.some(contact => contact.phoneNumber === phoneNumber);

      if ((email && !existingEmail) || (phoneNumber && !existingPhoneNumber)) {
        const newSecondaryContact = await this.prisma.contact.create({
          data: {
            email,
            phoneNumber,
            linkedId: primaryContact.id,
            linkPrecedence: 'secondary',
          },
        });
        secondaryContacts.push(newSecondaryContact);
      }
    } catch (error) {
      throw new Error('Error adding new secondary contact');
    }
  }

  private async updatePrimaryToSecondaryIfNeeded(email: string, phoneNumber: string, contacts: Contact[], primaryContact: Contact, secondaryContacts: Contact[]) {
    try {
      const primaryContactWithEmail = contacts.find(contact => contact.email === email && contact.linkPrecedence === 'primary');
      const primaryContactWithPhoneNumber = contacts.find(contact => contact.phoneNumber === phoneNumber && contact.linkPrecedence === 'primary');

      if (primaryContactWithEmail && primaryContactWithPhoneNumber && primaryContactWithEmail.id !== primaryContactWithPhoneNumber.id) {
        const olderPrimaryContact = primaryContactWithEmail.createdAt < primaryContactWithPhoneNumber.createdAt ? primaryContactWithEmail : primaryContactWithPhoneNumber;
        const newerPrimaryContact = olderPrimaryContact === primaryContactWithEmail ? primaryContactWithPhoneNumber : primaryContactWithEmail;

        await this.prisma.contact.update({
          where: { id: newerPrimaryContact.id },
          data: { linkPrecedence: 'secondary', linkedId: olderPrimaryContact.id },
        });

        primaryContact = olderPrimaryContact;
        secondaryContacts.push(newerPrimaryContact);
      }
    } catch (error) {
      throw new Error('Error updating primary to secondary contact');
    }
  }

  private formatResponse(primary: Contact, secondaryContacts: Contact[]) {
    const allContacts = [primary, ...secondaryContacts];
    
    allContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const emails = [...new Set(allContacts.map(contact => contact.email).filter(Boolean))];
    const phoneNumbers = [...new Set(allContacts.map(contact => contact.phoneNumber).filter(Boolean))];
    const secondaryContactIds = secondaryContacts.map(contact => contact.id);

    return {
      contact: {
        primaryContactId: primary.id,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    };
  }
}
