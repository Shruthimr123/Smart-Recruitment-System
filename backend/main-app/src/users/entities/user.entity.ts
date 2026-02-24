import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Role } from './role.entity';
import { McqQuestion } from 'src/question-bank/entities/question.entity';
import { Job } from 'src/jobs/entities/job.entity';
import { Problem } from 'src/problem/entities/problem.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: false })
  phone: string;

  @Column({ name: 'hashed_password' })
  hashedPassword: string;

  @Column({ type: 'text', nullable: true })
  resetToken?: string | null;

  @Column({ type: 'bigint', nullable: true })
  lastResetRequest?: number | null;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: 'active' | 'inactive';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt: Date;

 
  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @OneToMany(() => McqQuestion, (mcqQuestion) => mcqQuestion.createdBy, {
    cascade: true,
  })
  mcqQuestions: McqQuestion[];

  @OneToMany(() => Job, (job) => job.createdBy)
  job: Job[];

  @OneToMany(() => Problem, (problem) => problem.createdBy)
  problems: Problem[];
}
