import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, SetNicknameDto, RefreshDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Google OAuth ──────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth boshlanishi' })
  googleLogin() {
    // Redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Request() req, @Res() res: Response) {
    const result = await this.authService.handleGoogleLogin(req.user);
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');

    // Redirect to frontend with tokens
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      needsNickname: String(result.needsNickname || false),
    });

    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  }

  // ─── Phone OTP ─────────────────────────────────────────────────────────────

  @Post('phone/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SMS kodi yuborish' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SMS kodni tasdiqlash' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // ─── Nickname setup ────────────────────────────────────────────────────────

  @Post('set-nickname')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Birinchi kirish uchun nickname belgilash' })
  setNickname(@Request() req, @Body() dto: SetNicknameDto) {
    return this.authService.setNickname(req.user.id, dto);
  }

  // ─── Token refresh ─────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access tokenni yangilash' })
  async refresh(@Body() dto: RefreshDto) {
    try {
      // Decode refresh token to get userId
      const payload = JSON.parse(
        Buffer.from(dto.refreshToken.split('.')[1], 'base64').toString(),
      );
      return this.authService.refreshTokens(payload.sub, dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token noto\'g\'ri');
    }
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chiqish' })
  logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  // ─── Me (quick check) ──────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Token validatsiyasi va user ma\'lumoti' })
  me(@Request() req) {
    return req.user;
  }
}
