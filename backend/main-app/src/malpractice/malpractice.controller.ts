import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MalpracticeService } from './malpractice.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('malpractice')
export class MalpracticeController {
  constructor(
    private readonly service: MalpracticeService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post('register-candidate')
  @UseInterceptors(FileInterceptor('file'))
  @Header('Access-Control-Allow-Origin', 'http://localhost:5173')
  @Header('Access-Control-Allow-Credentials', 'true')
  async registerCandidate(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { applicantId: string; embedding?: string },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const imageUrl = await this.cloudinary.uploadImage(file, 'profile');

    let embeddingArray: number[] | undefined;
    if (body.embedding) {
      try {
        embeddingArray = JSON.parse(body.embedding);
      } catch (e) {
        throw new BadRequestException('Invalid embedding format');
      }
    }

    const result = await this.service.registerCandidate({
      applicantId: body.applicantId,
      profileImageUrl: imageUrl,
      embedding: embeddingArray,
    });

    return {
      success: true,
      profileImageUrl: result.profileImageUrl,
      applicantId: result.applicant?.id || body.applicantId,
      isExisting: result['isExisting'] || false,
      totalViolations: result.totalViolations,
      isBlocked: result.isBlocked,
    };
  }

  @Post('verify-candidate')
  @UseInterceptors(FileInterceptor('file'))
  async verifyCandidate(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { applicantId: string; embedding: string },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    let embeddingArray: number[];
    try {
      embeddingArray = JSON.parse(body.embedding);
    } catch (e) {
      throw new BadRequestException('Invalid embedding format');
    }

    const imageUrl = await this.cloudinary.uploadImage(file, 'alerts');

    const result = await this.service.verifyCandidate({
      applicantId: body.applicantId,
      embedding: embeddingArray,
    });

    return {
      success: true,
      verified: result.verified,
      similarity: result.similarity,
      verificationImageUrl: imageUrl,
      totalViolations: result.totalViolations,
      isBlocked: result.isBlocked,
    };
  }

  //Alert endpoint returns violation status
  @Post('alert')
  @UseInterceptors(FileInterceptor('file'))
  async addAlert(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { alertMessage: string; applicantId: string },
  ) {
    if (!file) throw new BadRequestException('No image file provided');

    const imageUrl = await this.cloudinary.uploadImage(file, 'alerts');
    const result = await this.service.addAlert({
      applicantId: body.applicantId,
      alertMessage: body.alertMessage,
      malpracticeImageUrl: imageUrl,
    });

    return {
      success: true,
      alertId: result.alert.id,
      applicantId: result.alert.applicant?.id,
      malpracticeImageUrl: result.alert.malpracticeImageUrl,
      totalViolations: result.totalViolations,
      isBlocked: result.isBlocked,
      maxReached: result.maxReached,
    };
  }

  //Get violation status endpoint
  @Get('violation-status/:applicantId')
  async getViolationStatus(@Param('applicantId') applicantId: string) {
    const result = await this.service.getViolationStatus(applicantId);
    return {
      success: true,
      ...result,
    };
  }

  @Post('screen-violation')
  @UseInterceptors(FileInterceptor('file'))
  async addScreenViolation(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { alertMessage: string; applicantId: string },
  ) {
    if (!file) throw new BadRequestException('No image file provided');

    const imageUrl = await this.cloudinary.uploadImage(file, 'alerts');

    const result = await this.service.addAlert({
      applicantId: body.applicantId,
      alertMessage: body.alertMessage,
      malpracticeImageUrl: imageUrl,
    });

    return {
      success: true,
      alertId: result.alert.id,
      applicantId: result.alert.applicant?.id,
      malpracticeImageUrl: result.alert.malpracticeImageUrl,
      totalViolations: result.totalViolations,
      isBlocked: result.isBlocked,
      maxReached: result.maxReached,
    };
  }
}