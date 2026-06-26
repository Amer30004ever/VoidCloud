import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PlatformService } from '../platform/platform.service';

@WebSocketGateway({
  namespace: '/metrics',
  cors: { origin: '*' },
})
export class MetricsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MetricsGateway.name);
  private interval: NodeJS.Timeout | null = null;

  @WebSocketServer()
  server: Server;

  constructor(private readonly platformService: PlatformService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Metrics client connected: ${client.id}`);
    if (!this.interval) {
      this.interval = setInterval(async () => {
        try {
          const payload = await this.platformService.getLiveMetricsSnapshot();
          this.server.emit('metrics', payload);
        } catch (error) {
          this.logger.warn(
            `Metrics broadcast failed: ${error instanceof Error ? error.message : error}`,
          );
        }
      }, 5000);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Metrics client disconnected: ${client.id}`);
    void this.server.fetchSockets().then((sockets) => {
      if (sockets.length === 0 && this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    });
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(@ConnectedSocket() client: Socket) {
    const payload = await this.platformService.getLiveMetricsSnapshot();
    client.emit('metrics', payload);
    return { subscribed: true };
  }
}
