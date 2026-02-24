import { Body, Controller, Get, Param, Post, Delete } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';

@Controller('test')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post('generate-preview-link')
  async generatePreviewLink(@Body() dto: any) {
    try {
      console.log('Controller: Received request for generate-preview-link');
      const result = await this.evaluationService.generatePreviewLink(dto);
      console.log('Controller: Request completed successfully');
      return result;
    } catch (error) {
      console.error('Controller Error in generate-preview-link:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  @Post('generate-link')
  async generateLink(@Body() dto: any) {
    return this.evaluationService.generateLink(dto);
  }

  @Get('start/:token')
  async startTest(@Param('token') token: string) {
    return this.evaluationService.validateAndStartTest(token);
  }
  @Post('send-email')
  async sendTestEmail(@Body() emailDto: any) {
    return this.evaluationService.sendTestEmail(emailDto);
  }

  @Get('preview-coding/:applicantId/:attemptId/:languageId')
  async getPreviewCodingProblem(
    @Param('applicantId') applicantId: string,
    @Param('attemptId') attemptId: string,
    @Param('languageId') languageId: string,
  ) {
    return this.evaluationService.getAssignedProblemForPreview(
      applicantId,
      attemptId,
      languageId,
    );
  }
  @Delete('cleanup-preview-data')
  async cleanupPreviewData() {
    return this.evaluationService.cleanupPreviewData();
  }
  
  @Post('mark-token-used')
  async markTokenAsUsed(@Body() body: { token: string }) {
    return this.evaluationService.markTokenAsUsed(body.token);
  }
}
