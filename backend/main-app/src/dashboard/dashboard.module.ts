import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Applicant } from 'src/evaluation/entities/applicants.entity';
import { TestAttempt } from 'src/evaluation/entities/test-attempt.entity';
import { Submission } from 'src/problem/entities/submission.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
 
@Module({
  imports: [TypeOrmModule.forFeature([Applicant, TestAttempt, Submission])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}