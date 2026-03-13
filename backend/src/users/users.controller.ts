import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, ChangePasswordDto, CheckNicknameDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CloudinaryService } from '../common/cloudinary.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'O\'z profilini olish' })
  getMe(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profilni yangilash' })
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Put('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Parol o\'zgartirish' })
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto);
  }

  @Put('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Profil rasmini yuklash' })
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const url = await this.cloudinaryService.uploadAvatar(file.buffer, req.user.id);
    return this.usersService.updateAvatar(req.user.id, url);
  }

  @Post('check-nickname')
  @ApiOperation({ summary: 'Nickname mavjudligini tekshirish' })
  checkNickname(@Body() dto: CheckNicknameDto) {
    return this.usersService.checkNicknameAvailable(dto.nickname);
  }

  @Get(':nickname')
  @ApiOperation({ summary: 'Foydalanuvchi profilini olish (nickname orqali)' })
  getPublicProfile(@Param('nickname') nickname: string) {
    return this.usersService.getPublicProfile(nickname);
  }
}
