import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TestAttempt } from './test-attempt.entity';

@Entity('test_access_tokens')
export class TestAccessToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

  @Column({ default: false })
  is_used: boolean;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'boolean', default: false })
  is_preview: boolean;

  @ManyToOne(() => TestAttempt)
  @JoinColumn({ name: 'test_attempt_id' })
  test_attempt: TestAttempt;

  @ManyToOne(() => TestAttempt, (testAttempt) => testAttempt.test_access_tokens)
  @JoinColumn({ name: 'test_attempt_id' })
  test_attempts: TestAttempt;
}