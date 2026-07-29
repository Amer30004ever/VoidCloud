export function sendSlackAlert(message: string): void {
  // stub
}

export class SlackNotifier {
  async notify(message: string): Promise<void> {
    // stub
  }
}

export const slackNotifier = new SlackNotifier();
