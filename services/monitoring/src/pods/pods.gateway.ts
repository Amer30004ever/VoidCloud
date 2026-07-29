import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { PodsK8sService } from './pods.service';

type StreamState = {
  stop: () => void;
};

@WebSocketGateway({
  namespace: 'pods',
  cors: { origin: '*' },
})
export class PodsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(PodsGateway.name);
  private readonly streams = new Map<string, StreamState>();

  constructor(private readonly k8s: PodsK8sService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`WS connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.stopStream(client);
    this.logger.log(`WS disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { namespace: string; pod: string; container?: string; tailLines?: number },
  ) {
    this.stopStream(client);
    const ns = data.namespace || 'voidcloud';
    const tailLines = data.tailLines ?? 200;
    let lastCount = 0;

    const interval = setInterval(async () => {
      try {
        const log = await this.k8s.getLogStream(ns, data.pod, data.container, tailLines);
        const lines = (log || '').split('\n').filter((line) => line.trim().length > 0);
        if (lines.length > lastCount) {
          const newLines = lines.slice(lastCount);
          client.emit('log', { pod: data.pod, namespace: ns, lines: newLines });
          lastCount = lines.length;
        }
        client.emit('status', { pod: data.pod, alive: true });
      } catch (e: any) {
        client.emit('error', { pod: data.pod, message: e?.message ?? 'Failed to fetch logs' });
      }
    }, 1500);

    this.streams.set(client.id, {
      stop: () => clearInterval(interval),
    });
    client.emit('joined', { pod: data.pod, namespace: ns });
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket) {
    this.stopStream(client);
    client.emit('left');
  }

  private stopStream(client: Socket) {
    const stream = this.streams.get(client.id);
    if (stream) {
      stream.stop();
      this.streams.delete(client.id);
    }
  }
}
