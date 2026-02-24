import { Applicant } from 'src/evaluation/entities/applicants.entity';
import { TestAttempt } from 'src/evaluation/entities/test-attempt.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('submission')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicantId: string;

  @ManyToOne(() => Applicant, (applicant) => applicant.submissions)
  @JoinColumn({ name: 'applicantId' })
  applicant: Applicant;

  @Column({ type: 'uuid', nullable: true })
  testAttemptId: string;

  @ManyToOne(() => TestAttempt, (testAttempt) => testAttempt.submissions)
  @JoinColumn({ name: 'test_attempt_id' })
  testAttempt: TestAttempt;

  @Column()
  problemKey: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text', nullable: true })
  output: string;

  @Column()
  status: string; 

  @Column({ type: 'jsonb' })
  testResults: any;

  @CreateDateColumn()
  createdAt: Date;
}
