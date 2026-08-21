/**
 * The CRM DTOs are the first line of defence against mass assignment.
 *
 * services/crm/src/main.ts registers the global ValidationPipe with
 * `whitelist: true, forbidNonWhitelisted: true, transform: true`. These tests
 * drive a pipe configured identically, so a DTO that silently gains a
 * passthrough field (or loses its constraints) fails here.
 */
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import {
  CreateActivityDto,
  CreateCompanyDto,
  CreateContactDto,
  CreateDealDto,
  CreateLeadDto,
  CreateTaskDto,
  CreateWhatsappMessageDto,
  ListQueryDto,
  UpdateDealStageDto,
} from '../../services/crm/src/crm/dto/crm.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const run = (metatype: any, value: unknown) =>
  pipe.transform(value as never, { type: 'body', metatype });

describe('CRM DTO validation', () => {
  describe.each([
    ['CreateContactDto', CreateContactDto, { name: 'Acme' }],
    ['CreateLeadDto', CreateLeadDto, { name: 'Lead' }],
    ['CreateCompanyDto', CreateCompanyDto, { name: 'Co' }],
    ['CreateDealDto', CreateDealDto, { title: 'D', value: 10 }],
    ['CreateTaskDto', CreateTaskDto, { title: 'T' }],
    ['CreateActivityDto', CreateActivityDto, { type: 'call', description: 'x' }],
    [
      'CreateWhatsappMessageDto',
      CreateWhatsappMessageDto,
      { contactId: 'c1', waMessageId: 'w1', direction: 'inbound', content: 'hi' },
    ],
  ])('%s', (_label, Dto, valid) => {
    it('accepts a minimal valid payload', async () => {
      await expect(run(Dto, { ...valid })).resolves.toMatchObject(valid);
    });

    it('rejects an injected userId', async () => {
      await expect(run(Dto, { ...valid, userId: 'someone-else' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an injected id', async () => {
      await expect(run(Dto, { ...valid, id: 'forced' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an arbitrary unknown field', async () => {
      await expect(run(Dto, { ...valid, __proto_pollution: 1 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  it('enforces the deal stage enum', async () => {
    await expect(run(UpdateDealStageDto, { stage: 'closed_won' })).resolves.toEqual({
      stage: 'closed_won',
    });
    await expect(run(UpdateDealStageDto, { stage: 'totally_won' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('enforces the lead status enum', async () => {
    await expect(run(CreateLeadDto, { name: 'L', status: 'qualified' })).resolves.toMatchObject({
      status: 'qualified',
    });
    await expect(run(CreateLeadDto, { name: 'L', status: 'vip' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('enforces the WhatsApp direction and type enums', async () => {
    const base = { contactId: 'c1', waMessageId: 'w1', content: 'hi' };
    await expect(run(CreateWhatsappMessageDto, { ...base, direction: 'sideways' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      run(CreateWhatsappMessageDto, { ...base, direction: 'inbound', type: 'hologram' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires the mandatory fields', async () => {
    await expect(run(CreateDealDto, { title: 'no value' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(run(CreateContactDto, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('coerces numeric list query params and bounds them', async () => {
    await expect(run(ListQueryDto, { take: '10', skip: '5' })).resolves.toEqual({
      take: 10,
      skip: 5,
    });
    await expect(run(ListQueryDto, { take: '5000' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(run(ListQueryDto, { skip: '-1' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
