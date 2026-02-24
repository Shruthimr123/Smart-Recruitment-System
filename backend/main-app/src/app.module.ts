import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApplicantQuestionModule } from './applicant-questions/applicant-questions.module';
import { ApplicantsModule } from './applicants/applicants.module';
import { AuthModule } from './auth/auth.module';
import { getTypeOrmConfig } from './config/ormconfig';
import { DashboardModule } from './dashboard/dashboard.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { ExecuteModule } from './execute/execute.module';
import { JobsModule } from './jobs/jobs.module';
import { MailerModule } from './mailer/mailer.module';
import { MalpracticeModule } from './malpractice/malpractice.module';
import { ProblemModule } from './problem/problem.module';
import { QuestionBankModule } from './question-bank/question-bank.module';
import { SkillsModule } from './skills/skills.module';
import { SubmissionModule } from './submissions/submission.module';
import { UsersModule } from './users/users.module';
import { AITestModule } from './ai-test/ai-test.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    AuthModule,
    UsersModule,
    JobsModule,
    SkillsModule,
    QuestionBankModule,
    ApplicantsModule,
    ApplicantQuestionModule,
    EvaluationModule,
    MailerModule,
    MalpracticeModule,
    ProblemModule,
    ExecuteModule,
    SubmissionModule,
    DashboardModule,
    AITestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
