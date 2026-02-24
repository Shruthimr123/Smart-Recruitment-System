
import { TestAttempt } from 'src/evaluation/entities/test-attempt.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ name: 'client_name' })
  clientName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt: Date;

  @ManyToOne(() => User, (user) => user.job)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @OneToMany(() => TestAttempt, (testAttempt) => testAttempt.job)
  testAttempts: TestAttempt[];
}
