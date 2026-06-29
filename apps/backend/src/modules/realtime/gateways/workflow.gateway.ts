import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Logger, Injectable } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import type { RealtimeEventPayload } from "@docpulse/shared-types";

@Injectable()
@WebSocketGateway({
  cors: {
    origin: (
      origin: string,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowed = process.env["FRONTEND_URL"] || "http://localhost:3000";
      if (!origin || origin === allowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
})
export class WorkflowGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WorkflowGateway.name);

  @WebSocketServer()
  public server?: Server;

  public handleConnection(client: Socket): void {
    this.logger.log(`Client connected: [${client.id}]`);
  }

  public handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: [${client.id}]`);
  }

  @SubscribeMessage("subscribe")
  public handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { workflowId?: string; repositoryId?: string; runId?: string },
  ): void {
    const { workflowId, repositoryId, runId } = data || {};
    if (workflowId) {
      void client.join(`workflow:${workflowId}`);
      this.logger.debug(
        `Client [${client.id}] subscribed to room [workflow:${workflowId}]`,
      );
    }
    if (repositoryId) {
      void client.join(`repository:${repositoryId}`);
      this.logger.debug(
        `Client [${client.id}] subscribed to room [repository:${repositoryId}]`,
      );
    }
    if (runId) {
      void client.join(`run:${runId}`);
      this.logger.debug(
        `Client [${client.id}] subscribed to room [run:${runId}]`,
      );
    }
  }

  @SubscribeMessage("unsubscribe")
  public handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { workflowId?: string; repositoryId?: string; runId?: string },
  ): void {
    const { workflowId, repositoryId, runId } = data || {};
    if (workflowId) {
      void client.leave(`workflow:${workflowId}`);
      this.logger.debug(
        `Client [${client.id}] unsubscribed from room [workflow:${workflowId}]`,
      );
    }
    if (repositoryId) {
      void client.leave(`repository:${repositoryId}`);
      this.logger.debug(
        `Client [${client.id}] unsubscribed from room [repository:${repositoryId}]`,
      );
    }
    if (runId) {
      void client.leave(`run:${runId}`);
      this.logger.debug(
        `Client [${client.id}] unsubscribed from room [run:${runId}]`,
      );
    }
  }

  /**
   * Emits structured event payload to specific targeted rooms and global stream.
   * Strictly decoupled from business logic or database access.
   */
  public emitEvent(payload: RealtimeEventPayload): void {
    if (!this.server) {
      this.logger.warn(
        "WebSocket server is not initialized yet. Skipping emit.",
      );
      return;
    }

    const eventName = payload.eventType || "workflow.event";

    // Broadcast to run room
    if (payload.runId) {
      this.server.to(`run:${payload.runId}`).emit(eventName, payload);
    }
    // Broadcast to repository room
    if (payload.repositoryId) {
      this.server
        .to(`repository:${payload.repositoryId}`)
        .emit(eventName, payload);
    }
    // Broadcast to workflow room
    if (payload.workflowId) {
      this.server.to(`workflow:${payload.workflowId}`).emit(eventName, payload);
    }

    // Broadcast globally for dashboard feeds
    this.server.emit(eventName, payload);
  }
}
