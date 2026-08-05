import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { ConsolidatedInvoiceService } from './consolidated-invoice.service';
import { EtaInvoiceService } from './eta-invoice.service';

@Controller('billing/enterprise')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Enterprise Billing')
@ApiBearerAuth()
export class EnterpriseBillingController {
  constructor(
    private readonly consolidated: ConsolidatedInvoiceService,
    private readonly eta: EtaInvoiceService,
  ) {}

  @Get('organizations/:orgId/consolidated')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List consolidated invoices for an organization' })
  list(@Param('orgId') orgId: string) {
    return this.consolidated.list(orgId);
  }

  @Post('organizations/:orgId/consolidated')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Build the draft consolidated invoice for a period' })
  build(
    @Param('orgId') orgId: string,
    @Body() body: { month?: string; taxRate?: number },
  ) {
    const reference = body?.month ? new Date(`${body.month}-01T00:00:00Z`) : new Date();
    return this.consolidated.build(orgId, reference, body?.taxRate ?? 0);
  }

  @Get('consolidated/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  get(@Param('id') id: string) {
    return this.consolidated.get(id);
  }

  @Post('consolidated/:id/issue')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Issue a consolidated invoice' })
  issue(@Param('id') id: string) {
    return this.consolidated.issue(id);
  }

  @Get('eta/submissions')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'List Egypt ETA e-invoice submissions' })
  submissions(@Query('status') status?: string) {
    return this.eta.list(status);
  }

  @Get('eta/status')
  @Roles('SUPER_ADMIN')
  status() {
    return { configured: this.eta.isConfigured() };
  }

  @Post('eta/invoices/:invoiceId/prepare')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Build the ETA document for an invoice without sending it' })
  prepare(@Param('invoiceId') invoiceId: string) {
    return this.eta.prepare(invoiceId);
  }

  @Post('eta/invoices/:invoiceId/submit')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Submit an invoice to the Egyptian Tax Authority' })
  submit(@Param('invoiceId') invoiceId: string) {
    return this.eta.submit(invoiceId);
  }
}
