import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, JoinRoomDto, InvitePlayerDto } from './dto/room.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi xona yaratish' })
  createRoom(@Request() req, @Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(req.user.id, dto);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xonaga kod orqali kirish' })
  joinRoom(@Request() req, @Body() dto: JoinRoomDto) {
    return this.roomsService.joinRoom(req.user.id, dto);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Xona ma\'lumotini olish (kod orqali)' })
  getRoomByCode(@Param('code') code: string) {
    return this.roomsService.getRoomByCode(code);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'O\'yinchiga taklif yuborish' })
  invitePlayer(
    @Request() req,
    @Param('id') roomId: string,
    @Body() dto: InvitePlayerDto,
  ) {
    return this.roomsService.invitePlayer(req.user.id, roomId, dto.nickname);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Xonadan chiqish' })
  leaveRoom(@Request() req, @Param('id') roomId: string) {
    return this.roomsService.leaveRoom(req.user.id, roomId);
  }
}
