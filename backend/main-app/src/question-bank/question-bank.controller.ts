import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { QuestionBankService } from './question-bank.service';
import { CreateMcqQuestionDto } from './dto/create-mcq-question.dto';
import { ApplicantQuestionService } from 'src/applicant-questions/applicant-questions.service';

@Controller('mcq-questions')
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService,
  ) { }

  @Post()
  async createMcqQuestion(@Body() createMcqQuestionDto: CreateMcqQuestionDto) {
    const question =
      await this.questionBankService.createMcqQuestion(createMcqQuestionDto);

    return {
      statuscode: '201',
      message: 'MCQ Question created successfully',
      data: question,
    };
  }

  @Get()
  async getAllMcqQuestion() {
    const question = await this.questionBankService.getAllMcqQuestion();
    return {
      statuscode: '200',
      message: 'All MCQ Question retrieved successfully',
      data: question,
    };
  }

  @Get('by-skill/:skillId')
  async getQuestionsBySkill(@Param('skillId') skillId: string) {
    const questions = await this.questionBankService.findBySkill(skillId);
    if (!questions || questions.length === 0) {
      throw new NotFoundException('No questions found for this skill');
    }
    return { data: questions };
  }
}
