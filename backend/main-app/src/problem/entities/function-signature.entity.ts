import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Problem } from './problem.entity';
import { Language } from './language.entity';

@Entity('function_signatures')
export class FunctionSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  problemId: string;

  @Column()
  languageId: string;

  @Column('text')
  signature: string;

  @ManyToOne(() => Problem, (problem) => problem.functionSignatures, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'problemId' }) 
  problem: Problem;

  @ManyToOne(() => Language, { eager: true })
  @JoinColumn({ name: 'languageId' })
  language: Language;
}
