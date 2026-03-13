import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get('CLOUDINARY_API_KEY'),
      api_secret: configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadAvatar(buffer: Buffer, userId: string): Promise<string> {
    // If cloudinary not configured, return placeholder
    if (!this.configService.get('CLOUDINARY_CLOUD_NAME')) {
      this.logger.warn('Cloudinary not configured, using placeholder');
      return `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'imposter-game/avatars',
            public_id: `user-${userId}`,
            overwrite: true,
            transformation: [
              { width: 200, height: 200, crop: 'fill', gravity: 'face' },
              { quality: 'auto', format: 'webp' },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          },
        )
        .end(buffer);
    });
  }

  async deleteAvatar(userId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(`imposter-game/avatars/user-${userId}`);
    } catch (error) {
      this.logger.error(`Avatar o'chirishda xato: ${error.message}`);
    }
  }
}
