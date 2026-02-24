import { Malpractice } from 'src/malpractice/entities/malpractice.entity';
import { Submission } from 'src/problem/entities/submission.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExperienceLevel } from './experience_levels.entity';
import { TestAttempt } from './test-attempt.entity';

@Entity('applicant')
export class Applicant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @ManyToOne(() => ExperienceLevel)
  @JoinColumn({ name: 'experience_level_id' })
  experience_level: ExperienceLevel;

  @ManyToOne(() => Skill)
  @JoinColumn({ name: 'primary_skill_id' })
  primary_skill: Skill;

  @ManyToOne(() => Skill, { nullable: true }) // Add nullable: true
  @JoinColumn({ name: 'secondary_skill_id' })
  secondary_skill: Skill | null; // Change to Skill | null

  @OneToMany(() => Malpractice, (malpractice) => malpractice.applicant, {
    cascade: true,
  })
  malpractice: Malpractice[];

  @OneToMany(() => TestAttempt, (testAttempt) => testAttempt.applicant)
  test_attempts: TestAttempt[];

  @OneToMany(() => Submission, (submission) => submission.applicant)
  submissions: Submission[];
}