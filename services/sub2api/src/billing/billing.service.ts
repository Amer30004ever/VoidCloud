import { Injectable } from '@nestjs/common';

@Injectable()
export class BillingService {
  async getBillingInfo(userId: string) {
    // TODO: Implement billing logic
    return { userId, balance: 0 };
  }
}
