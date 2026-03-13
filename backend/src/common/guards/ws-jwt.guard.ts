import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization?.replace('Bearer ', '');

    if (!token) throw new WsException('Token talab qilinadi');

    const user = await this.authService.validateSocketToken(token);
    if (!user) throw new WsException('Token noto\'g\'ri');

    client.data.user = user;
    return true;
  }
}
