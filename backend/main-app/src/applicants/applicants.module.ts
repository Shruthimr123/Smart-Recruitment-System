import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicantQuestion } from 'src/applicant-questions/entities/applicant_questions.entity';
import { Applicant } from 'src/evaluation/entities/applicants.entity';
import { TestAttempt } from 'src/evaluation/entities/test-attempt.entity';
import { MalpracticeModule } from 'src/malpractice/malpractice.module';
import { Problem } from 'src/problem/entities/problem.entity';
import { Submission } from 'src/problem/entities/submission.entity';
import { Option } from 'src/question-bank/entities/option.entity';
import { McqQuestion } from 'src/question-bank/entities/question.entity';
import { ApplicantsController } from './applicants.controller';
import { ApplicantsService } from './applicants.service';
import { ApplicantAnswer } from './entities/applicant-answer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Applicant,
      McqQuestion,
      Option,
      ApplicantQuestion,
      ApplicantAnswer,
      TestAttempt,
      Submission,
      Problem,
    ]),
    MalpracticeModule,
  ],
  providers: [ApplicantsService],
  controllers: [ApplicantsController],
  exports: [ApplicantsService],
})
export class ApplicantsModule {}
