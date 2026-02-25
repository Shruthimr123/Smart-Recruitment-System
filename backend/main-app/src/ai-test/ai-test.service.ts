import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApplicantAnswer } from 'src/applicants/entities/applicant-answer.entity';
import { ApplicantProblem } from 'src/applicant-questions/entities/applicant_problem.entity';
import { ApplicantQuestion } from 'src/applicant-questions/entities/applicant_questions.entity';
import { Applicant } from 'src/evaluation/entities/applicants.entity';
import { ExperienceLevel } from 'src/evaluation/entities/experience_levels.entity';
import { TestAccessToken } from 'src/evaluation/entities/test-access-token.entity';
import { TestAttempt } from 'src/evaluation/entities/test-attempt.entity';
import { Job } from 'src/jobs/entities/job.entity';
import { MailerService } from 'src/mailer/mailer.service';
import { Problem } from 'src/problem/entities/problem.entity';
import { Option } from 'src/question-bank/entities/option.entity';
import { McqQuestion } from 'src/question-bank/entities/question.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { User } from 'src/users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AITestSessionEntity } from './entities/ai-test.entity';
import { McqMode } from 'src/evaluation/dto/link.dto';

interface AITestSession {
  applicantId: string;
  attemptId: string;
  currentDifficulty: 'easy' | 'medium' | 'hard';
  questionsInCurrentSet: number; // used only for first batch
  totalQuestionsAnswered: number;
  currentSetScore: number; // used only for first batch

  // Sliding window buffer (last 5 answers)
  lastFiveResults: {
    difficulty: 'easy' | 'medium' | 'hard';
    isCorrect: boolean;
  }[];
  difficultyEvaluatedAtQuestion: number;
}

@Injectable()
export class AITestService {
  private aiSessions: Map<string, AITestSession> = new Map();

  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Applicant)
    private applicantRepo: Repository<Applicant>,

    @InjectRepository(Skill)
    private skillRepo: Repository<Skill>,

    @InjectRepository(McqQuestion)
    private questionRepo: Repository<McqQuestion>,

    @InjectRepository(TestAttempt)
    private attemptRepo: Repository<TestAttempt>,

    @InjectRepository(TestAccessToken)
    private tokenRepo: Repository<TestAccessToken>,

    @InjectRepository(ApplicantQuestion)
    private applicantQuestionRepo: Repository<ApplicantQuestion>,

    @InjectRepository(ApplicantProblem)
    private apRepo: Repository<ApplicantProblem>,

    @InjectRepository(Problem)
    private problemRepo: Repository<Problem>,

    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(ExperienceLevel)
    private expRepo: Repository<ExperienceLevel>,

    @InjectRepository(Option)
    private optionRepo: Repository<Option>,

    @InjectRepository(ApplicantAnswer)
    private answerRepo: Repository<ApplicantAnswer>,

    @InjectRepository(AITestSessionEntity)
    private aiSessionRepo: Repository<AITestSessionEntity>,

    private readonly mailService: MailerService,
  ) { }

  private mapEntityToSession(entity: AITestSessionEntity): AITestSession {
    return {
      applicantId: entity.applicantId,
      attemptId: entity.attemptId,
      currentDifficulty: entity.currentDifficulty,
      questionsInCurrentSet: entity.questionsInCurrentSet,
      totalQuestionsAnswered: entity.totalQuestionsAnswered,
      currentSetScore: entity.currentSetScore,

      lastFiveResults: Array.isArray(entity.lastFiveResults)
        ? entity.lastFiveResults.map((r: any) =>
          typeof r === 'boolean'
            ? { difficulty: entity.currentDifficulty, isCorrect: r } // migrate old data
            : r,
        )
        : [],

      difficultyEvaluatedAtQuestion: entity.difficultyEvaluatedAtQuestion || 0,
    };
  }

  async generateAITestLink(dto: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Use the existing generateLink logic but mark as AI mode
      const modifiedDto = {
        ...dto,
        manual_mcqs: [], // No manual questions for AI mode
        auto_mcqs_count: 0, // Will be generated on-demand
        mcq_mode: McqMode.AI, // Mark as AI mode
      };

      // Check if applicant already exists
      let existingApplicant = await this.applicantRepo.findOne({
        where: { email: dto.email },
        relations: ['test_attempts'],
      });

      let savedApplicant: Applicant;
      let savedAttempt: TestAttempt;

      if (existingApplicant) {
        const existingAttempts = existingApplicant.test_attempts || [];
        const activeAttempts = existingAttempts.filter(
          (attempt) =>
            !attempt.is_submitted && attempt.test_status !== 'completed',
        );

        if (activeAttempts.length > 0) {
          throw new BadRequestException(
            'Applicant already has an active test attempt.',
          );
        }

        if (existingAttempts.length >= 3) {
          throw new BadRequestException('Maximum test attempts exceeded (3)');
        }

        // Update existing applicant
        existingApplicant.name = dto.name;
        existingApplicant.phone = dto.phone;
        existingApplicant.experience_level = {
          id: dto.experience_level_id,
        } as ExperienceLevel;
        existingApplicant.primary_skill = { id: dto.primary_skill_id } as Skill;
        existingApplicant.secondary_skill = dto.secondary_skill_id
          ? ({ id: dto.secondary_skill_id } as Skill)
          : null;

        savedApplicant = await queryRunner.manager.save(existingApplicant);
      } else {
        // Create new applicant
        const applicant = this.applicantRepo.create({
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          experience_level: { id: dto.experience_level_id } as ExperienceLevel,
          primary_skill: { id: dto.primary_skill_id } as Skill,
        });

        if (dto.secondary_skill_id) {
          applicant.secondary_skill = { id: dto.secondary_skill_id } as Skill;
        }

        savedApplicant = await queryRunner.manager.save(applicant);
      }

      // Create AI test attempt
      const newAttempt = this.attemptRepo.create({
        applicant: savedApplicant,
        job: { id: dto.job_id } as Job,
        ta: { id: dto.ta_id } as User,
        test_status: 'pending',
        attempt_count: 0,
        schedule_start: new Date(),
        schedule_end: new Date(Date.now() + 24 * 60 * 60 * 1000),
        is_preview: false,
        mcq_mode: McqMode.AI

      });

      savedAttempt = await queryRunner.manager.save(newAttempt);

      // Initialize AI session
      const sessionKey = `${savedApplicant.id}_${savedAttempt.id}`;
      const newSession: AITestSession = {
        applicantId: savedApplicant.id,
        attemptId: savedAttempt.id,
        currentDifficulty: 'easy',
        questionsInCurrentSet: 0,
        totalQuestionsAnswered: 0,
        currentSetScore: 0,
        lastFiveResults: [],
        difficultyEvaluatedAtQuestion: 0,
      };

      this.aiSessions.set(sessionKey, newSession);
      await this.persistSession(newSession);

      // Generate token
      const token = uuidv4();
      const testAccessToken = this.tokenRepo.create({
        token,
        test_attempt: savedAttempt,
        is_used: false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        is_preview: false,
      });
      await queryRunner.manager.save(testAccessToken);

      await queryRunner.commitTransaction();

      return {
        statusCode: 200,
        message: 'AI Test link generated successfully',
        token,
        attemptId: savedAttempt.id,
        applicantId: savedApplicant.id,
        isPreview: false,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async generateAIFinalLink(dto: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find existing attempt
      const attempts = await this.attemptRepo.find({
        where: {
          applicant: { email: dto.email },
          is_submitted: false,
        },
        relations: ['applicant'],
        order: { created_at: 'DESC' },
      });

      const attempt = attempts[0]; // Get the latest attempt

      if (!attempt) {
        throw new NotFoundException('No active test attempt found');
      }

      // Assign coding problem
      const applicant = await this.applicantRepo.findOne({
        where: { id: attempt.applicant.id },
        relations: ['experience_level'],
      });

      if (!applicant) {
        throw new NotFoundException('Applicant not found');
      }

      const experienceYears = applicant.experience_level?.max_year ?? 0;
      let difficulty: 'easy' | 'medium' | 'hard';
      if (experienceYears <= 2) difficulty = 'easy';
      else if (experienceYears <= 5) difficulty = 'medium';
      else difficulty = 'hard';

      const problems = await this.problemRepo.find({
        where: { difficulty },
        relations: ['functionSignatures', 'functionNames', 'testCases'],
      });

      if (!problems.length) {
        throw new NotFoundException(
          `No problems found for difficulty: ${difficulty}`,
        );
      }

      const selected = problems[Math.floor(Math.random() * problems.length)];

      // Delete any existing assignment
      await queryRunner.manager.delete(ApplicantProblem, {
        test_attempt: { id: attempt.id },
      });

      const problemAssignment = queryRunner.manager.create(ApplicantProblem, {
        applicant: { id: attempt.applicant.id },
        test_attempt: { id: attempt.id },
        problem: selected,
      });

      await queryRunner.manager.save(problemAssignment);

      // Generate final token
      const finalToken = uuidv4();
      const finalGeneratedLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/ai-test/${finalToken}/${attempt.applicant.id}/${attempt.id}`;

      // Save final token
      const testAccessToken = this.tokenRepo.create({
        token: finalToken,
        test_attempt: attempt,
        is_used: false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        is_preview: false,
      });
      await queryRunner.manager.save(testAccessToken);

      // Send email
      await this.mailService.sendTestLink(
        dto.email,
        dto.name,
        finalGeneratedLink,
      );

      await queryRunner.commitTransaction();

      return {
        statusCode: 201,
        message: 'AI Test link sent successfully',
        token: finalToken,
        attemptId: attempt.id,
        applicantId: attempt.applicant.id,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getAssignedQuestions(applicantId: string, attemptId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, applicant: { id: applicantId } },
      relations: ['applicant'],
    });

    if (!attempt) {
      throw new NotFoundException('Test attempt not found');
    }

    return {
      attemptCount: attempt.attempt_count || 0,
      applicantName: attempt.applicant?.name || 'Applicant',
      applicantEmail: attempt.applicant?.email || '',
    };
  }

  private async persistSession(session: AITestSession) {
    let dbSession = await this.aiSessionRepo.findOne({
      where: {
        applicantId: session.applicantId,
        attemptId: session.attemptId,
      },
    });

    if (!dbSession) {
      dbSession = this.aiSessionRepo.create(session);
    } else {
      Object.assign(dbSession, session);
    }

    await this.aiSessionRepo.save(dbSession);
  }

  private async restoreSession(applicantId: string, attemptId: string) {
    return this.aiSessionRepo.findOne({
      where: { applicantId, attemptId },
    });
  }

  async startAITest(applicantId: string, attemptId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, applicant: { id: applicantId } },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    //  Block after 3 attempts
    if ((attempt.attempt_count || 0) >= 3) {
      throw new BadRequestException('MAXIMUM_ATTEMPTS_EXCEEDED');
    }

    attempt.attempt_count = (attempt.attempt_count || 0) + 1;

    attempt.test_status = 'attending';
    await this.attemptRepo.save(attempt);

    if (attempt.mcq_completed) {
      return {
        skipMCQ: true,
        attemptCount: attempt.attempt_count,
        message: 'MCQ already completed',
      };
    }


    const dbSession = await this.restoreSession(applicantId, attemptId);

    if (dbSession) {
      const session = this.mapEntityToSession(dbSession);

      this.aiSessions.set(`${applicantId}_${attemptId}`, session);

      return {
        resumed: true,
        attemptCount: attempt.attempt_count,
        totalAnswered: session.totalQuestionsAnswered,
        currentQuestionNumber: session.totalQuestionsAnswered + 1,
      };
    }

    const applicant = await this.applicantRepo.findOne({
      where: { id: applicantId },
      relations: ['experience_level'],
    });

    const expYears = applicant?.experience_level?.max_year ?? 0;

    let initialDifficulty: 'easy' | 'medium' | 'hard';
    if (expYears <= 2) initialDifficulty = 'easy';
    else if (expYears <= 5) initialDifficulty = 'medium';
    else initialDifficulty = 'hard';

    const newSession: AITestSession = {
      applicantId,
      attemptId,
      currentDifficulty: initialDifficulty,
      questionsInCurrentSet: 0,
      totalQuestionsAnswered: 0,
      currentSetScore: 0,
      lastFiveResults: [],
      difficultyEvaluatedAtQuestion: 0,
    };

    await this.persistSession(newSession);
    this.aiSessions.set(`${applicantId}_${attemptId}`, newSession);

    return {
      resumed: false,
      attemptCount: attempt.attempt_count,
      totalAnswered: 0,
      currentQuestionNumber: 1,
    };
  }

  async getCurrentQuestions(applicantId: string, attemptId: string) {
    const sessionKey = `${applicantId}_${attemptId}`;
    let session = this.aiSessions.get(sessionKey);


    if (!session) {
      const dbSession = await this.restoreSession(applicantId, attemptId);

      if (dbSession) {
        session = this.mapEntityToSession(dbSession);
        this.aiSessions.set(sessionKey, session);
      }
    }

    if (!session) {
      throw new BadRequestException('Session not found. Start test first.');
    }

    // Global limit check
    if (session.totalQuestionsAnswered >= 30) {
      return {
        questions: [],
        completed: true,
        totalQuestionsAnswered: 30,
        currentQuestionNumber: 30,
      };
    }

    let questions;


    if (session.totalQuestionsAnswered < 5) {
      const remainingFirstBatch = 5 - session.totalQuestionsAnswered;

      questions = await this.getQuestionsForDifficulty(
        applicantId,
        attemptId,
        session.currentDifficulty,
        remainingFirstBatch,
      );
    }
    else {
      questions = await this.getQuestionsForDifficulty(
        applicantId,
        attemptId,
        session.currentDifficulty,
        1,
      );
    }

    return {
      resumed: true,
      questions,
      currentDifficulty: session.currentDifficulty,
      totalQuestionsAnswered: session.totalQuestionsAnswered,
      currentQuestionNumber: session.totalQuestionsAnswered + 1,
      totalQuestions: 30,
    };
  }

  private async getQuestionsForDifficulty(
    applicantId: string,
    attemptId: string,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
  ) {
    // Get attempt to know the primary skill
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId },
      relations: ['applicant', 'applicant.primary_skill'],
    });

    if (!attempt || !attempt.applicant.primary_skill) {
      throw new NotFoundException('Test attempt or primary skill not found');
    }

    const skillId = attempt.applicant.primary_skill.id;

    // Get questions that haven't been assigned yet
    const query = this.questionRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.options', 'options')
      .leftJoinAndSelect('q.skill', 'skill')
      .where('skill.id = :skillId', { skillId })
      .andWhere('q.difficulty = :difficulty', { difficulty });

    // Exclude already assigned questions
    const assignedQuestions = await this.applicantQuestionRepo.find({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
      },
      relations: ['mcq_question'],
    });

    const excludeIds = assignedQuestions.map((aq) => aq.mcq_question.id);
    if (excludeIds.length > 0) {
      query.andWhere('q.id NOT IN (:...excludeIds)', { excludeIds });
    }

    const questions = await query.orderBy('RANDOM()').limit(count).getMany();

    //  get how many questions already assigned for this attempt
    const existingCount = await this.applicantQuestionRepo.count({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
      },
    });

    let orderCounter = existingCount;

    // save question_order
    for (const question of questions) {
      orderCounter++;

      const applicantQuestion = this.applicantQuestionRepo.create({
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
        mcq_question: question,
        status: 'not_visited',
        is_preview: false,
        question_order: orderCounter,
      });

      await this.applicantQuestionRepo.save(applicantQuestion);
    }

    const savedQuestions = await this.applicantQuestionRepo
      .createQueryBuilder('aq')
      .leftJoinAndSelect('aq.mcq_question', 'mcq_question')
      .leftJoinAndSelect('mcq_question.options', 'options')
      .leftJoinAndSelect('mcq_question.skill', 'skill')
      .where('aq.applicant.id = :applicantId', { applicantId })
      .andWhere('aq.test_attempt.id = :attemptId', { attemptId })
      .andWhere('mcq_question.id IN (:...questionIds)', {
        questionIds: questions.map((q) => q.id),
      })
      .orderBy('aq.question_order', 'ASC')
      .getMany();

    return savedQuestions.map((aq) => ({
      id: aq.id,
      status: aq.status,
      selectedOptionId: aq.selected_option?.id || null,
      editable: aq.status === 'not_visited',
      mcq_question: {
        id: aq.mcq_question.id,
        questionTitle: aq.mcq_question.questionTitle,
        difficulty: aq.mcq_question.difficulty,
        options: aq.mcq_question.options,
        skill: aq.mcq_question.skill,
      },
    }));
  }
  
  async saveAnswer(
    applicantId: string,
    attemptId: string,
    questionId: string,
    selectedOptionId: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate option
      const option = await this.optionRepo.findOne({
        where: { id: selectedOptionId },
        relations: ['mcqQuestion'],
      });

      if (!option || option.mcqQuestion.id !== questionId) {
        throw new NotFoundException('Invalid option selected');
      }

      // Get applicant question
      const applicantQuestion = await this.applicantQuestionRepo.findOne({
        where: {
          applicant: { id: applicantId },
          test_attempt: { id: attemptId },
          mcq_question: { id: questionId },
        },
      });

      if (!applicantQuestion) {
        throw new NotFoundException('Applicant question not found');
      }

      if (applicantQuestion.status === 'answered') {
        throw new BadRequestException(
          'You have already submitted this question',
        );
      }

      // Save answer
      const answer = this.answerRepo.create({
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
        mcq_question: { id: questionId },
        selected_option: option,
        answered_at: new Date(),
      });

      await queryRunner.manager.save(answer);


      applicantQuestion.status = 'answered';
      await queryRunner.manager.save(applicantQuestion);

      const sessionKey = `${applicantId}_${attemptId}`;
      const session = this.aiSessions.get(sessionKey);

      if (session) {

        if (session.totalQuestionsAnswered >= 30) {
          throw new BadRequestException('MCQ section already completed');
        }
        session.totalQuestionsAnswered++;


        session.lastFiveResults.push({
          difficulty: session.currentDifficulty,
          isCorrect: option.isCorrect,
        });

        if (session.lastFiveResults.length > 20) {
          session.lastFiveResults.shift();
        }

        if (session.totalQuestionsAnswered <= 5) {
          session.questionsInCurrentSet++;
          if (option.isCorrect) session.currentSetScore++;
        }

        // Persist progress
        this.aiSessions.set(sessionKey, session);
        await this.persistSession(session);


        if (session.totalQuestionsAnswered === 30) {
          await queryRunner.manager.update(
            TestAttempt,
            { id: attemptId },
            { mcq_completed: true }, // add column
          );
        }
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Answer submitted successfully',
        isCorrect: option.isCorrect,
        mcqCompleted: session?.totalQuestionsAnswered === 30,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getNextQuestionSet(applicantId: string, attemptId: string) {
    const sessionKey = `${applicantId}_${attemptId}`;
    const session = this.aiSessions.get(sessionKey);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.totalQuestionsAnswered >= 30) {
      return {
        questions: [],
        completed: true,
        totalQuestionsAnswered: 30,
      };
    }

    let nextDifficulty = session.currentDifficulty;

    const sameDifficultyAnswers = session.lastFiveResults
      .filter((r) => r.difficulty === session.currentDifficulty)
      .slice(-5);

    if (
      sameDifficultyAnswers.length === 5 &&
      session.difficultyEvaluatedAtQuestion !== session.totalQuestionsAnswered
    ) {
      const correctCount = sameDifficultyAnswers.filter(
        (r) => r.isCorrect,
      ).length;
      const percentage = (correctCount / 5) * 100;

      //  LEVEL UP (≥80%)
      if (percentage >= 80) {
        if (session.currentDifficulty === 'easy') nextDifficulty = 'medium';
        else if (session.currentDifficulty === 'medium')
          nextDifficulty = 'hard';
      }

      // LEVEL DOWN (<50%)
      else if (percentage < 50) {
        if (session.currentDifficulty === 'hard') nextDifficulty = 'medium';
        else if (session.currentDifficulty === 'medium')
          nextDifficulty = 'easy';
      }

      // STAY SAME (50%–79%)
      else {
        nextDifficulty = session.currentDifficulty;
      }

      // lock evaluation so refresh won't re-evaluate
      session.currentDifficulty = nextDifficulty;
      session.difficultyEvaluatedAtQuestion = session.totalQuestionsAnswered;
    }


    const questions = await this.getQuestionsForDifficulty(
      applicantId,
      attemptId,
      nextDifficulty,
      1,
    );

    await this.persistSession(session);

    return {
      questions,
      currentDifficulty: nextDifficulty,
      totalQuestionsAnswered: session.totalQuestionsAnswered,
      currentQuestionNumber: session.totalQuestionsAnswered + 1,
    };
  }

  async evaluateTest(applicantId: string, attemptId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const answers = await queryRunner.manager.find(ApplicantAnswer, {
        where: {
          applicant: { id: applicantId },
          test_attempt: { id: attemptId },
        },
        relations: ['selected_option'],
        // order: {
        //   answered_at: "ASC",
        // },
      });

      const correct = answers.filter(
        (a) => a.selected_option?.isCorrect,
      ).length;

      const total = answers.length;
      const wrong = total - correct;
      const percentage =
        total > 0 ? ((correct / total) * 100).toFixed(2) + '%' : '0%';

      // Update attempt
      await queryRunner.manager.update(
        TestAttempt,
        { id: attemptId },
        {
          mcq_score: correct,
          test_status: 'completed',
          is_submitted: true,
          applicant_completed_at: new Date(),
        },
      );

      // Mark token used
      const token = await queryRunner.manager.findOne(TestAccessToken, {
        where: { test_attempt: { id: attemptId } },
      });

      if (token) {
        token.is_used = true;
        await queryRunner.manager.save(token);
      }

      // Cleanup session (DB)
      await queryRunner.manager.delete(AITestSessionEntity, {
        applicantId,
        attemptId,
      });

      // Cleanup memory
      const sessionKey = `${applicantId}_${attemptId}`;
      this.aiSessions.delete(sessionKey);

      await queryRunner.commitTransaction();

      return {
        total,
        correct,
        wrong,
        percentage,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
