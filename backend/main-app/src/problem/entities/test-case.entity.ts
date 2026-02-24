
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Problem } from './problem.entity';
 
@Entity('test_cases')
export class TestCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;
 
  @Column()
  problemId: string;
 
  @Column('jsonb')  
  input: any;     
 
  @Column('jsonb', { name: 'expected_output' })
  expectedOutput: any;
 
  @Column({ default: false })
  isHidden: boolean;
 

  @ManyToOne(() => Problem, (problem) => problem.testCases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'problemId' })
  problem: Problem;
}
