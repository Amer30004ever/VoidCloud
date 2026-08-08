import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { withImpersonation } from '../common/audit-impersonation';


export interface AiContext {
  vpsCount: number;
  runningVps: number;
  creditBalance: number;
  invoiceCount: number;
  lastInvoiceAmount: number;
}

@Injectable()
export class AiContextService {
  constructor(private readonly prisma: PrismaService) {}

  async gather(user: { id: string; role: Role }): Promise<AiContext> {
    const where = user.role === Role.SUPER_ADMIN ? {} : { userId: user.id };
    const [vpsList, balanceUser, invoices] = await Promise.all([
      this.prisma.cloudDeployment.findMany({
        where,
        select: { status: true },
      }),
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { creditBalance: true },
      }),
      this.prisma.cloudInvoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { amountUSD: true },
      }),
    ]);

    return {
      vpsCount: vpsList.length,
      runningVps: vpsList.filter((v) => v.status === 'RUNNING').length,
      creditBalance: balanceUser?.creditBalance ?? 0,
      invoiceCount: invoices.length,
      lastInvoiceAmount: invoices[0]?.amountUSD ?? 0,
    };
  }
}

export type ToolName =
  | 'vps_status'
  | 'restart_vps'
  | 'top_up_credits'
  | 'list_invoices'
  | 'open_ticket';

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextService: AiContextService,
  ) {}

  private async auditToolCall(
    user: { id: string; role: Role; impersonatedBy?: string },
    toolName: ToolName,
    args: Record<string, unknown>,
    result: unknown,
    status = 'SUCCESS',
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: `AI_TOOL_${toolName.toUpperCase()}`,
          userId: user.id,
          resource: `ai-tool:${toolName}`,
          details: {
            arguments: args,
            result,
            ...(user.impersonatedBy ? { impersonatedBy: user.impersonatedBy } : {}),
          } as never,
          status,
        },
      });
    } catch (error) {
      this.logger.warn(`AI tool audit failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private findOwnedVps(id: string, user: { id: string; role: Role }) {
    return this.prisma.cloudDeployment.findUnique({ where: { id } }).then((vps) => {
      if (!vps) throw new Error('VPS not found');
      if (user.role !== Role.SUPER_ADMIN && vps.userId !== user.id) {
        throw new Error('VPS not found');
      }
      return vps;
    });
  }

  async execute(
    toolName: ToolName,
    args: Record<string, string | number>,
    user: { id: string; role: Role; impersonatedBy?: string },
    confirmed = false,
  ) {
    if (!confirmed && (toolName === 'restart_vps' || toolName === 'top_up_credits')) {
      return { status: 'pending_confirmation', toolName, message: 'This action requires confirmation' };
    }

    let result: unknown;
    try {
      switch (toolName) {
        case 'vps_status':
          result = await this.vpsStatus(user);
          break;
        case 'restart_vps': {
          const vpsId = String(args.vpsId ?? '');
          if (!vpsId) throw new Error('vpsId is required');
          const vps = await this.findOwnedVps(vpsId, user);
          await this.prisma.cloudDeployment.update({
            where: { id: vps.id },
            data: { status: 'RESTARTING' },
          });
          result = { status: 'queued', vpsId: vps.id, action: 'restart' };
          break;
        }
        case 'top_up_credits':
          result = { status: 'info', message: 'Redirect to billing page to complete top-up' };
          break;
        case 'list_invoices':
          result = await this.listInvoices(user);
          break;
        case 'open_ticket':
          result = await this.openTicket(user, String(args.subject ?? 'Support request'), String(args.message ?? ''));
          break;
        default:
          throw new Error('Unknown tool');
      }
      await this.auditToolCall(user, toolName, args, result);
      return result;
    } catch (error) {
      await this.auditToolCall(user, toolName, args, { error: String(error) }, 'FAILED');
      throw error;
    }
  }

  async vpsStatus(user: { id: string; role: Role }) {
    const ctx = await this.contextService.gather(user);
    return {
      count: ctx.vpsCount,
      running: ctx.runningVps > 0,
      runningCount: ctx.runningVps,
    };
  }

  async listInvoices(user: { id: string; role: Role }) {
    const ctx = await this.contextService.gather(user);
    return { count: ctx.invoiceCount, lastAmount: ctx.lastInvoiceAmount };
  }

  private async openTicket(
    user: { id: string },
    subject: string,
    message: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: user.id,
        title: subject || 'Support ticket',
        message: message || 'Opened via AI assistant',
        type: 'info',
        category: 'support',
      },
    });
    return { ticketId: notification.id, status: 'created' };
  }
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly ollamaUrl =
    process.env.OLLAMA_URL ?? 'http://ollama.voidcloud.svc.cluster.local:11434';
  private readonly ollamaModel = process.env.OLLAMA_CHAT_MODEL ?? 'llama3.2';
  private readonly hostedApiKey = process.env.AI_HOSTED_API_KEY ?? process.env.OPENAI_API_KEY;
  private readonly hostedApiUrl =
    process.env.AI_HOSTED_API_URL ?? 'https://api.openai.com/v1/chat/completions';
  private readonly hostedModel = process.env.AI_HOSTED_MODEL ?? 'gpt-4o-mini';

  constructor(
    private readonly contextService: AiContextService,
    private readonly toolsService: AiToolsService,
  ) {}

  async chat(
    message: string,
    user: { id: string; role: Role; impersonatedBy?: string },
  ) {
    const context = await this.contextService.gather(user);
    const systemPrompt = [
      'You are VoidCloud AI assistant. Answer using the tenant context below.',
      `VPS count: ${context.vpsCount}, running: ${context.runningVps}`,
      `Credit balance: ${context.creditBalance}`,
      `Recent invoices: ${context.invoiceCount}, last amount USD: ${context.lastInvoiceAmount}`,
      'For destructive actions (restart VPS, top up credits), tell the user confirmation is required.',
    ].join('\n');

    const tierB = this.shouldUseTierB(message);
    if (tierB && this.hostedApiKey) {
      return this.chatHosted(systemPrompt, message, user);
    }
    return this.chatOllama(systemPrompt, message);
  }

  /**
   * Tier 5.16 — cost/usage advice generated by the LLM from the tenant's real
   * context. If no model answers, we return an explicitly-labelled heuristic so
   * the UI never presents canned copy as if it were AI output.
   */
  async usageAdvice(user: { id: string; role: Role; impersonatedBy?: string }): Promise<{
    advice: string;
    source: 'llm' | 'heuristic';
    context: AiContext;
  }> {
    const context = await this.contextService.gather(user);
    const systemPrompt = [
      'You are VoidCloud\'s cost optimisation advisor.',
      'Give at most 3 short, specific, actionable suggestions about VPS usage, idle',
      'resources and credit balance, based only on the numbers below. Never invent data.',
      `VPS count: ${context.vpsCount}, running: ${context.runningVps}, stopped: ${context.vpsCount - context.runningVps}`,
      `Credit balance: ${context.creditBalance}`,
      `Recent invoices: ${context.invoiceCount}, last amount USD: ${context.lastInvoiceAmount}`,
    ].join('\n');

    const prompt = 'Summarise how my VoidCloud usage looks and what I should optimise.';
    const reply = this.hostedApiKey
      ? await this.adviseHosted(systemPrompt, prompt)
      : await this.chatOllama(systemPrompt, prompt);

    const content = typeof reply?.content === 'string' ? reply.content.trim() : '';
    const failed =
      !content || content.startsWith('Local AI is temporarily unavailable') ||
      content.startsWith('I could not generate a response');

    if (failed) {
      return { advice: this.heuristicAdvice(context), source: 'heuristic', context };
    }
    return { advice: content, source: 'llm', context };
  }

  private async adviseHosted(systemPrompt: string, prompt: string) {
    try {
      const response = await fetch(this.hostedApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.hostedApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.hostedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!response.ok) {
        return this.chatOllama(systemPrompt, prompt);
      }
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return { role: 'assistant', tier: 'A', content: data.choices?.[0]?.message?.content ?? '' };
    } catch (error) {
      this.logger.warn(
        `Hosted advisor unavailable: ${error instanceof Error ? error.message : error}`,
      );
      return this.chatOllama(systemPrompt, prompt);
    }
  }

  private heuristicAdvice(context: AiContext): string {
    const tips: string[] = [];
    const idle = context.vpsCount - context.runningVps;
    if (idle > 0) {
      tips.push(
        `${idle} of your ${context.vpsCount} VPS instances are not running — delete or snapshot the ones you no longer need so they stop consuming storage.`,
      );
    }
    if (context.runningVps === 0 && context.vpsCount === 0) {
      tips.push('You have no VPS instances yet — provisioning one is the first step.');
    }
    if (context.creditBalance <= 0) {
      tips.push('Your credit balance is empty; top up to avoid running instances being suspended.');
    } else if (context.lastInvoiceAmount > 0 && context.creditBalance < context.lastInvoiceAmount) {
      tips.push(
        `Your balance (${context.creditBalance}) is below your last invoice (${context.lastInvoiceAmount} USD) — consider topping up before the next cycle.`,
      );
    }
    if (tips.length === 0) {
      tips.push('No idle instances and a healthy balance — nothing needs attention right now.');
    }
    return tips.join(' ');
  }



  private shouldUseTierB(message: string): boolean {
    const lower = message.toLowerCase();
    return ['restart', 'top up', 'delete', 'cancel', 'purchase', 'pay'].some((k) => lower.includes(k));
  }

  private async chatOllama(systemPrompt: string, message: string) {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          stream: false,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error(`Ollama error ${response.status}`);
      }
      const data = (await response.json()) as { message?: { content?: string } };
      return {
        role: 'assistant',
        tier: 'A',
        content: data.message?.content ?? 'I could not generate a response right now.',
      };
    } catch (error) {
      this.logger.warn(`Ollama unavailable, falling back: ${error instanceof Error ? error.message : error}`);
      return {
        role: 'assistant',
        tier: 'A',
        content:
          'Local AI is temporarily unavailable. You can still use dashboard actions for VPS, billing, and support.',
      };
    }
  }

  private async chatHosted(
    systemPrompt: string,
    message: string,
    user: { id: string; role: Role },
  ) {
    const tools = [
      { type: 'function', function: { name: 'vps_status', description: 'Get VPS status', parameters: { type: 'object', properties: {} } } },
      { type: 'function', function: { name: 'list_invoices', description: 'List recent invoices', parameters: { type: 'object', properties: {} } } },
      { type: 'function', function: { name: 'restart_vps', description: 'Restart a VPS', parameters: { type: 'object', properties: { vpsId: { type: 'string' } }, required: ['vpsId'] } } },
    ];

    const response = await fetch(this.hostedApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.hostedApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.hostedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        tools,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      return this.chatOllama(systemPrompt, message);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string; tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }>;
    };
    const choice = data.choices?.[0]?.message;
    const toolCall = choice?.tool_calls?.[0]?.function;
    if (toolCall?.name) {
      const args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
      const requiresConfirmation = toolCall.name === 'restart_vps';
      if (requiresConfirmation) {
        return {
          role: 'assistant',
          tier: 'B',
          content: 'I can perform that action after you confirm in the UI.',
          requiresConfirmation: true,
          toolCalls: [{ name: toolCall.name, arguments: args }],
        };
      }
      const result = await this.toolsService.execute(toolCall.name as ToolName, args, user, true);
      return {
        role: 'assistant',
        tier: 'B',
        content: choice?.content ?? 'Action completed.',
        toolResult: result,
      };
    }

    return {
      role: 'assistant',
      tier: 'B',
      content: choice?.content ?? 'How can I help with your VoidCloud account?',
    };
  }
}
