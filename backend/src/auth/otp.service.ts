import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  // In-memory OTP store (use Redis in production)
  private readonly otpStore = new Map<string, OtpEntry>();
  private readonly MAX_ATTEMPTS = 5;
  private readonly OTP_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(phoneNumber: string): Promise<void> {
    // Check if recent OTP exists (rate limiting)
    const existing = this.otpStore.get(phoneNumber);
    if (existing && existing.expiresAt - Date.now() > 4 * 60 * 1000) {
      throw new BadRequestException('Siz allaqachon kod so\'radingiz. 1 daqiqa kuting.');
    }

    const code = this.generateCode();
    this.otpStore.set(phoneNumber, {
      code,
      expiresAt: Date.now() + this.OTP_TTL,
      attempts: 0,
    });

    // Send via Twilio in production
    if (this.configService.get('NODE_ENV') === 'production') {
      await this.sendViaTwilio(phoneNumber, code);
    } else {
      // Development: log the code
      this.logger.log(`📱 OTP for ${phoneNumber}: ${code}`);
    }

    // Auto cleanup
    setTimeout(() => this.otpStore.delete(phoneNumber), this.OTP_TTL + 1000);
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const entry = this.otpStore.get(phoneNumber);

    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(phoneNumber);
      return false;
    }

    entry.attempts++;
    if (entry.attempts > this.MAX_ATTEMPTS) {
      this.otpStore.delete(phoneNumber);
      throw new BadRequestException('Juda ko\'p urinish. Yangi kod so\'rang.');
    }

    if (entry.code !== code) return false;

    this.otpStore.delete(phoneNumber);
    return true;
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendViaTwilio(phoneNumber: string, code: string): Promise<void> {
    try {
      // Dynamic import to avoid crash if twilio not configured
      const twilio = require('twilio');
      const client = twilio(
        this.configService.get('TWILIO_ACCOUNT_SID'),
        this.configService.get('TWILIO_AUTH_TOKEN'),
      );

      await client.messages.create({
        body: `Imposter Game tasdiqlash kodi: ${code}\nKod 5 daqiqa amal qiladi.`,
        from: this.configService.get('TWILIO_PHONE_NUMBER'),
        to: phoneNumber,
      });
    } catch (error) {
      this.logger.error(`SMS yuborishda xato: ${error.message}`);
      throw new BadRequestException('SMS yuborishda xato yuz berdi');
    }
  }
}
