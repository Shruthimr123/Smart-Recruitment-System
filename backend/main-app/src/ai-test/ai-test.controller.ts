import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AITestService } from './ai-test.service';

@Controller('ai-test')
export class AITestController {
  constructor(private readonly aiTestService: AITestService) {}

  @Post('generate-ai-link')
  async generateAITestLink(@Body() dto: any) {
    return this.aiTestService.generateAITestLink(dto);
  }

  @Post('generate-ai-final-link')
  async generateAIFinalLink(@Body() dto: any) {
    return this.aiTestService.generateAIFinalLink(dto);
  }

  @Get('assigned/:applicantId/:attemptId')
  async getAssignedQuestions(
    @Param('applicantId') applicantId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.aiTestService.getAssignedQuestions(applicantId, attemptId);
  }

  @Post('start/:applicantId/:attemptId')
  async startAITest(
    @Param('applicantId') applicantId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.aiTestService.startAITest(applicantId, attemptId);
  }

  @Get('questions/:applicantId/:attemptId')
  async getCurrentQuestions(
    @Param('applicantId') applicantId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.aiTestService.getCurrentQuestions(applicantId, attemptId);
  }

  @Post('answer')
  async saveAnswer(
    @Body()
    body: {
      applicantId: string;
      attemptId: string;
      questionId: string;
      selectedOptionId: string;
    },
  ) {
    const { applicantId, attemptId, questionId, selectedOptionId } = body;
    return this.aiTestService.saveAnswer(
      applicantId,
      attemptId,
      questionId,
      selectedOptionId,
    );
  }

  @Get('next-set/:applicantId/:attemptId')
  async getNextQuestionSet(
    @Param('applicantId') applicantId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.aiTestService.getNextQuestionSet(applicantId, attemptId);
  }

  @Post('evaluate')
  async evaluateTest(
    @Body() body: { applicantId: string; attemptId: string },
  ) {
    const { applicantId, attemptId } = body;
    return this.aiTestService.evaluateTest(applicantId, attemptId);
  }

  
}