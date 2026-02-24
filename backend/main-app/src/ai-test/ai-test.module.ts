import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AITestService } from './ai-test.service';
import { AITestController } from './ai-test.controller';
import { Applicant } from 'src/evaluation/entities/applicants.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { McqQuestion } from 'src/question-bank/entities/question.entity';
import { TestAttempt } from 'src/evaluation/entities/test-attempt.entity';
import { TestAccessToken } from 'src/evaluation/entities/test-access-token.entity';
import { ApplicantQuestion } from 'src/applicant-questions/entities/applicant_questions.entity';
import { ExperienceLevel } from 'src/evaluation/entities/experience_levels.entity';
import { Job } from 'src/jobs/entities/job.entity';
import { MailerModule } from 'src/mailer/mailer.module';
import { ApplicantProblem } from 'src/applicant-questions/entities/applicant_problem.entity';
import { Problem } from 'src/problem/entities/problem.entity';
import { Option } from 'src/question-bank/entities/option.entity';
import { ApplicantAnswer } from 'src/applicants/entities/applicant-answer.entity';
import { AITestSessionEntity } from './entities/ai-test.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Applicant,
      Skill,
      McqQuestion,
      TestAttempt,
      TestAccessToken,
      ApplicantQuestion,
      ExperienceLevel,
      Job,
      ApplicantProblem,
      Problem,
      Option,
      ApplicantAnswer,
      AITestSessionEntity
    ]),
    MailerModule,
  ],
  controllers: [AITestController],
  providers: [AITestService],
  exports: [AITestService],
})
export class AITestModule {}