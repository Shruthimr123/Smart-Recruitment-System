import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
 
@Entity('ai_test_sessions')
export class AITestSessionEntity {
 
  @PrimaryGeneratedColumn('uuid')
  id: string;
 
  @Column()
  applicantId: string;
 
  @Column()
  attemptId: string;
 
  @Column()
  currentDifficulty: 'easy' | 'medium' | 'hard';
 
  @Column({ default: 0 })
  questionsInCurrentSet: number;
 
  @Column({ default: 0 })
  totalQuestionsAnswered: number;
 
  @Column({ default: 0 })
  currentSetScore: number;
 
  @Column({ type: 'jsonb', nullable: true })
  lastFiveResults: {
    difficulty: 'easy' | 'medium' | 'hard';
    isCorrect: boolean;
  }[];
 
 
  @Column({ default: 0 })
  difficultyEvaluatedAtQuestion: number;
 
  @UpdateDateColumn()
  updatedAt: Date;
}