import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApplicantQuestion } from 'src/applicant-questions/entities/applicant_questions.entity';
import { ApplicantProblem } from 'src/applicant-questions/entities/applicant_problem.entity';
import { Job } from 'src/jobs/entities/job.entity';
import { MailerService } from 'src/mailer/mailer.service';
import { Problem } from 'src/problem/entities/problem.entity';
import { McqQuestion } from 'src/question-bank/entities/question.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { User } from 'src/users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { GenerateTestLinkDto } from './dto/link.dto';
import { Applicant } from './entities/applicants.entity';
import { ExperienceLevel } from './entities/experience_levels.entity';
import { TestAccessToken } from './entities/test-access-token.entity';
import { TestAttempt } from './entities/test-attempt.entity';
import { McqMode } from './dto/link.dto';


@Injectable()
export class EvaluationService {
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

    private readonly mailService: MailerService,
  ) { }

  async generateQuestionsByProfile(
    expLevelId: string,
    primarySkillId: string,
    secondarySkillId?: string,
    testAttemptId?: string,
    limit?: number,
  ): Promise<McqQuestion[]> {
    const experienceLevel = await this.expRepo.findOne({
      where: { id: expLevelId },
    });

    if (!experienceLevel) {
      throw new BadRequestException('Invalid experience level');
    }

    const levelKey = experienceLevel.name as
      | 'Fresher'
      | 'Junior'
      | 'Mid'
      | 'Senior';
    const isFresher = levelKey === 'Fresher';
    const hasSecondary = !!secondarySkillId;

    const difficultyMatrix = {
      Fresher: { easy: 80, medium: 20, hard: 0 },
      Junior: { easy: 50, medium: 40, hard: 10 },
      Mid: { easy: 40, medium: 40, hard: 20 },
      Senior: { easy: 0, medium: 30, hard: 70 },
    };

    const difficultySplit = difficultyMatrix[levelKey];

    const shuffleArray = <T>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // Step 1: Exclude previously seen question IDs
    let excludeQuestionIds: string[] = [];
    if (testAttemptId) {
      const existing = await this.applicantQuestionRepo.find({
        where: { test_attempt: { id: testAttemptId } },
        relations: ['mcq_question'],
      });
      excludeQuestionIds = existing.map((item) => item.mcq_question.id);
    }

    const getDifficultyCounts = (
      total: number,
      split: Partial<Record<'easy' | 'medium' | 'hard', number>> = {},
      allowHard: boolean,
    ) => {
      // Ensure all keys exist and default to 0
      const safeSplit = {
        easy: split.easy ?? 0,
        medium: split.medium ?? 0,
        hard: split.hard ?? 0,
      };

      const adjustedSplit = allowHard
        ? safeSplit
        : {
          easy:
            safeSplit.easy +
            (safeSplit.hard / 100) *
            (safeSplit.easy / (safeSplit.easy + safeSplit.medium || 1)),
          medium:
            safeSplit.medium +
            (safeSplit.hard / 100) *
            (safeSplit.medium / (safeSplit.easy + safeSplit.medium || 1)),
          hard: 0,
        };

      const easy = Math.floor((adjustedSplit.easy / 100) * total);
      const medium = Math.floor((adjustedSplit.medium / 100) * total);
      const hard = allowHard ? total - (easy + medium) : 0;

      const sum = easy + medium + hard;
      const diff = total - sum;

      return {
        easy: easy + diff,
        medium,
        hard,
      };
    };

    // Safe fetchQuestionsBySkill
    const fetchQuestionsBySkill = async (
      skillId: string,
      totalCount: number,
      allowHard: boolean,
      difficultySplit?: Partial<Record<'easy' | 'medium' | 'hard', number>>,
    ): Promise<McqQuestion[]> => {
      // Use safe defaults if difficultySplit is missing
      const counts = getDifficultyCounts(
        totalCount,
        difficultySplit ?? { easy: 50, medium: 50, hard: 0 },
        allowHard,
      );

      const result: McqQuestion[] = [];
      const alreadyFetched = new Set<string>();

      for (const [difficulty, count] of Object.entries(counts)) {
        if (count <= 0) continue;

        const query = this.questionRepo
          .createQueryBuilder('q')
          .where('q.skill.id = :skillId', { skillId })
          .andWhere('q.difficulty = :difficulty', { difficulty });

        const excluded = [...excludeQuestionIds, ...alreadyFetched];
        if (excluded.length > 0) {
          query.andWhere('q.id NOT IN (:...excludeIds)', {
            excludeIds: excluded,
          });
        }

        const questions = await query
          .orderBy('RANDOM()')
          .limit(count)
          .getMany();
        questions.forEach((q) => alreadyFetched.add(q.id));
        result.push(...questions);
      }

      // Fallback if not enough questions fetched
      const remaining = totalCount - result.length;
      if (remaining > 0) {
        const fallbackQuery = this.questionRepo
          .createQueryBuilder('q')
          .where('q.skill.id = :skillId', { skillId });

        const excluded = [...excludeQuestionIds, ...alreadyFetched];
        if (excluded.length > 0) {
          fallbackQuery.andWhere('q.id NOT IN (:...excludeIds)', {
            excludeIds: excluded,
          });
        }

        const fallback = await fallbackQuery
          .orderBy('RANDOM()')
          .limit(remaining)
          .getMany();
        fallback.forEach((q) => alreadyFetched.add(q.id));
        result.push(...fallback);
      }

      return result;
    };

    const fetchAptitudeQuestions = async (): Promise<McqQuestion[]> => {
      const aptitudeSkill = await this.skillRepo.findOne({
        where: { name: 'aptitude' },
      });
      if (!aptitudeSkill)
        throw new BadRequestException('Aptitude skill not found');

      const total = 10;
      const counts = getDifficultyCounts(total, difficultySplit, true);
      const result: McqQuestion[] = [];
      const alreadyFetched = new Set<string>();

      const fetchByDifficulty = async (
        difficulty: string,
        count: number,
      ): Promise<McqQuestion[]> => {
        if (count <= 0) return [];

        const query = this.questionRepo
          .createQueryBuilder('q')
          .where('q.skill.id = :skillId', { skillId: aptitudeSkill.id })
          .andWhere('q.difficulty = :difficulty', { difficulty });

        const excluded = [...excludeQuestionIds, ...alreadyFetched];
        if (excluded.length > 0) {
          query.andWhere('q.id NOT IN (:...ids)', { ids: excluded });
        }

        const questions = await query
          .orderBy('RANDOM()')
          .limit(count)
          .getMany();
        questions.forEach((q) => alreadyFetched.add(q.id));
        return questions;
      };

      for (const [difficulty, count] of Object.entries(counts)) {
        const fetched = await fetchByDifficulty(difficulty, count);
        result.push(...fetched);
      }

      const remaining = total - result.length;
      if (remaining > 0) {
        const query = this.questionRepo
          .createQueryBuilder('q')
          .where('q.skill.id = :skillId', { skillId: aptitudeSkill.id });

        const excluded = [...excludeQuestionIds, ...alreadyFetched];
        if (excluded.length > 0) {
          query.andWhere('q.id NOT IN (:...ids)', { ids: excluded });
        }

        const fallback = await query
          .orderBy('RANDOM()')
          .limit(remaining)
          .getMany();
        fallback.forEach((q) => alreadyFetched.add(q.id));
        result.push(...fallback);
      }

      return result;
    };

    const result: McqQuestion[] = [];

    if (isFresher) {
      const aptitude = await fetchAptitudeQuestions(); // 10 questions
      const primary = await fetchQuestionsBySkill(
        primarySkillId,
        20,
        false,
        difficultySplit,
      );
      result.push(...aptitude, ...primary);
    } else {
      const skillCount = hasSecondary ? 15 : 30;
      const primary = await fetchQuestionsBySkill(
        primarySkillId,
        skillCount,
        levelKey === 'Senior' || levelKey === 'Mid',
        difficultySplit,
      );
      result.push(...primary);

      if (hasSecondary) {
        const secondary = await fetchQuestionsBySkill(
          secondarySkillId!,
          skillCount,
          levelKey === 'Senior' || levelKey === 'Mid',
          difficultySplit,
        );
        result.push(...secondary);
      }
    }

    // Ensure uniqueness
    const uniqueMap = new Map<string, McqQuestion>();
    for (const q of result) {
      if (!uniqueMap.has(q.id)) {
        uniqueMap.set(q.id, q);
      }
    }

    const uniqueQuestions = [...uniqueMap.values()];

    if (isFresher) {
      // For freshers: aptitude first (already pushed first), then technical
      return limit
        ? uniqueQuestions.slice(0, limit)
        : uniqueQuestions.slice(0, 30);
    } else {
      //  For experienced: shuffle technical questions
      const final = shuffleArray(uniqueQuestions);
      return limit ? final.slice(0, limit) : final.slice(0, 30);
    }
  }

  async generatePreviewLink(dto: any) {
    console.log('=== generatePreviewLink START ===');
    console.log('Received DTO:', dto);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate required fields
      const requiredFields = [
        'name',
        'email',
        'phone',
        'job_id',
        'experience_level_id',
        'primary_skill_id',
        'ta_id',
      ];
      const missingFields = requiredFields.filter((field) => !dto[field]);

      if (missingFields.length > 0) {
        throw new BadRequestException(
          `Missing required fields: ${missingFields.join(', ')}`,
        );
      }

      console.log('Creating temporary applicant...');

      // Create a temporary applicant with preview flag
      const tempApplicant = this.applicantRepo.create({
        name: dto.name,
        email: `preview-${Date.now()}-${dto.email}`,
        phone: dto.phone,
        experience_level: { id: dto.experience_level_id } as ExperienceLevel,
        primary_skill: { id: dto.primary_skill_id } as Skill,
      });

      if (dto.secondary_skill_id) {
        tempApplicant.secondary_skill = { id: dto.secondary_skill_id } as Skill;
      }

      const savedApplicant = await queryRunner.manager.save(tempApplicant);
      console.log('Applicant created:', savedApplicant.id);

      // Create preview test attempt
      console.log('Creating test attempt...');
      const previewAttempt = this.attemptRepo.create({
        applicant: savedApplicant,
        job: { id: dto.job_id } as Job,
        ta: { id: dto.ta_id } as User,
        test_status: 'pending',
        attempt_count: 0,
        schedule_start: new Date(),
        schedule_end: new Date(Date.now() + 24 * 60 * 60 * 1000),
        is_preview: true,
        mcq_mode: dto.mcq_mode,

      });

      const savedAttempt = await queryRunner.manager.save(previewAttempt);
      console.log('Test attempt created:', savedAttempt.id);

      // Handle manual MCQs
      const TOTAL_QUESTIONS = 30;
      const manualIds: string[] = dto.manual_mcqs ?? [];
      let manualQuestions: McqQuestion[] = [];

      console.log('Processing manual MCQs:', manualIds);

      if (manualIds.length > 0) {
        manualQuestions = await this.questionRepo
          .createQueryBuilder('q')
          .where('q.id IN (:...ids)', { ids: manualIds })
          .getMany();

        console.log('Found manual questions:', manualQuestions.length);

        for (const q of manualQuestions) {
          const applicantQuestion = this.applicantQuestionRepo.create({
            applicant: savedApplicant,
            test_attempt: savedAttempt,
            mcq_question: q,
            status: 'not_visited',
            is_preview: true,
          });
          await queryRunner.manager.save(applicantQuestion);
        }
      }

      // Generate auto questions
      const autoCount = Math.max(0, TOTAL_QUESTIONS - manualQuestions.length);
      console.log('Generating auto questions:', autoCount);

      if (autoCount > 0) {
        const autoQuestions = await this.generateQuestionsByProfile(
          dto.experience_level_id,
          dto.primary_skill_id,
          dto.secondary_skill_id,
          savedAttempt.id,
          autoCount,
        );

        console.log('Auto questions generated:', autoQuestions.length);

        for (const q of autoQuestions) {
          const applicantQuestion = this.applicantQuestionRepo.create({
            applicant: savedApplicant,
            test_attempt: savedAttempt,
            mcq_question: q,
            status: 'not_visited',
            is_preview: true,
          });
          await queryRunner.manager.save(applicantQuestion);
        }
      }

      // Assign coding problem
      console.log('Assigning coding problem...');
      const codingProblem = await this.assignProblemForPreview(
        savedApplicant.id,
        savedAttempt.id,
        queryRunner,
      );

      console.log('Coding problem assigned:', codingProblem.problemKey);

      // Generate token
      const token = uuidv4();
      console.log('Generated token:', token);

      const testAccessToken = this.tokenRepo.create({
        token,
        test_attempt: savedAttempt,
        is_used: false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        is_preview: true,
      });
      await queryRunner.manager.save(testAccessToken);

      await queryRunner.commitTransaction();
      console.log('=== generatePreviewLink SUCCESS ===');

      return {
        statusCode: 200,
        message: 'Preview link generated successfully',
        token,
        attemptId: savedAttempt.id,
        applicantId: savedApplicant.id,
        questionCount: manualQuestions.length + autoCount,
        codingProblemKey: codingProblem.problemKey, // Return for reference
        isPreview: true,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('=== generatePreviewLink ERROR ===');
      console.error('Error details:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      throw err;
    } finally {
      await queryRunner.release();
      console.log('=== generatePreviewLink END ===');
    }
  }

  async generateLink(dto: GenerateTestLinkDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log('=== GENERATING REAL TEST LINK ===');

      console.log('Preview problem key received:', dto.previewProblemKey);

      // 1. Check if applicant already exists
      let existingApplicant = await this.applicantRepo.findOne({
        where: { email: dto.email },
        relations: ['test_attempts'],
      });

      let savedApplicant: Applicant;
      let savedAttempt: TestAttempt;

      if (existingApplicant) {
        // Applicant exists - check if we can create a new attempt
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

      // 2. Create new test attempt
      const newAttempt = this.attemptRepo.create({
        applicant: savedApplicant,
        job: { id: dto.job_id } as Job,
        ta: { id: dto.ta_id } as User,
        test_status: 'pending',
        attempt_count: 0,
        schedule_start: new Date(),
        schedule_end: new Date(Date.now() + 24 * 60 * 60 * 1000),
        is_preview: false,
        mcq_mode: dto.mcq_mode,
      });

      savedAttempt = await queryRunner.manager.save(newAttempt);

      // 3. Delete any existing applicant questions
      await queryRunner.manager.delete(ApplicantQuestion, {
        test_attempt: { id: savedAttempt.id },
      });

      // 4.COPY MCQ QUESTIONS FROM PREVIEW INSTEAD OF REGENERATING
      if (dto.previewProblemKey) {
        const previewAttempts = await this.attemptRepo
          .createQueryBuilder('attempt')
          .leftJoinAndSelect('attempt.applicant', 'applicant')
          .where('applicant.email LIKE :email', {
            email: `preview-%${dto.email}%`,
          })
          .andWhere('attempt.is_preview = :isPreview', { isPreview: true })
          .orderBy('attempt.created_at', 'DESC')
          .getMany();

        const previewAttempt = previewAttempts[0];

        if (previewAttempt) {
          // Get all questions from the preview attempt
          const previewQuestions = await this.applicantQuestionRepo.find({
            where: {
              test_attempt: { id: previewAttempt.id },
            },
            relations: [
              'mcq_question',
              'mcq_question.options',
              'mcq_question.skill',
            ],
          });

          // Copy each question to the new attempt
          for (const previewQ of previewQuestions) {
            const applicantQuestion = this.applicantQuestionRepo.create({
              applicant: savedApplicant,
              test_attempt: savedAttempt,
              mcq_question: previewQ.mcq_question,
              status: 'not_visited',
              is_preview: false,
            });
            await queryRunner.manager.save(applicantQuestion);
          }
        } else {
          await this.generateAndSaveQuestions(
            dto,
            savedApplicant,
            savedAttempt,
            queryRunner,
          );
        }
      } else {
        // Fallback to original generation logic

        await this.generateAndSaveQuestions(
          dto,
          savedApplicant,
          savedAttempt,
          queryRunner,
        );
      }

      // 5. ASSIGN CODING PROBLEM USING PREVIEW PROBLEM KEY

      if (dto.previewProblemKey) {
        await this.assignProblemByKey(
          dto.previewProblemKey,
          savedApplicant.id,
          savedAttempt.id,
          queryRunner,
        );
      } else {
        await this.assignRandomProblem(
          savedApplicant.id,
          savedAttempt.id,
          queryRunner,
        );
      }

      // 6. Generate FINAL test token
      const finalToken = uuidv4();
      const finalGeneratedLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/test/${finalToken}/${savedApplicant.id}/${savedAttempt.id}`;

      // 7. Save FINAL token to DB
      const testAccessToken = this.tokenRepo.create({
        token: finalToken,
        test_attempt: savedAttempt,
        is_used: false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        is_preview: false,
      });
      await queryRunner.manager.save(testAccessToken);

      // 8. Send email with the FINAL link

      await this.mailService.sendTestLink(
        dto.email,
        dto.name,
        finalGeneratedLink,
      );

      // 9. Commit everything to database
      await queryRunner.commitTransaction();

      return {
        statusCode: 201,
        message: existingApplicant
          ? 'Test link regenerated successfully'
          : 'Test link generated successfully',
        token: finalToken,
        attemptId: savedAttempt.id,
        applicantId: savedApplicant.id,
        questionCount: (
          await this.applicantQuestionRepo.find({
            where: { test_attempt: { id: savedAttempt.id } },
          })
        ).length,
        isRegenerated: !!existingApplicant,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();

      if (
        err.message?.includes('email') ||
        err.code === 'ESOCKET' ||
        err.message?.includes('ETIMEDOUT')
      ) {
        throw new InternalServerErrorException(
          'Failed to send email. Please check your email configuration.',
        );
      }

      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async generateAndSaveQuestions(
    dto: GenerateTestLinkDto,
    savedApplicant: Applicant,
    savedAttempt: TestAttempt,
    queryRunner: any,
  ): Promise<void> {
    const TOTAL_QUESTIONS = 30;
    const manualIds: string[] = dto.manual_mcqs ?? [];
    let manualQuestions: McqQuestion[] = [];

    if (manualIds.length > 0) {
      manualQuestions = await this.questionRepo
        .createQueryBuilder('q')
        .where('q.id IN (:...ids)', { ids: manualIds })
        .getMany();

      for (const q of manualQuestions) {
        const applicantQuestion = this.applicantQuestionRepo.create({
          applicant: savedApplicant,
          test_attempt: savedAttempt,
          mcq_question: q,
          status: 'not_visited',
          is_preview: false,
        });
        await queryRunner.manager.save(applicantQuestion);
      }
    }

    // Generate auto questions
    const autoCount = Math.max(0, TOTAL_QUESTIONS - manualQuestions.length);

    if (autoCount > 0) {
      const autoQuestions = await this.generateQuestionsByProfile(
        dto.experience_level_id,
        dto.primary_skill_id,
        dto.secondary_skill_id,
        savedAttempt.id,
        autoCount,
      );

      for (const q of autoQuestions) {
        const applicantQuestion = this.applicantQuestionRepo.create({
          applicant: savedApplicant,
          test_attempt: savedAttempt,
          mcq_question: q,
          status: 'not_visited',
          is_preview: false,
        });
        await queryRunner.manager.save(applicantQuestion);
      }
    }
  }

  private async assignProblemByKey(
    problemKey: string,
    applicantId: string,
    attemptId: string,
    queryRunner: any,
  ): Promise<any> {
    try {
      const problem = await queryRunner.manager.findOne(Problem, {
        where: { key: problemKey },
        relations: ['functionSignatures', 'functionNames', 'testCases'],
      });

      if (!problem) {
        throw new Error(`Problem with key "${problemKey}" not found`);
      }

      // Delete any existing assignment for this attempt
      await queryRunner.manager.delete(ApplicantProblem, {
        test_attempt: { id: attemptId },
      });

      // Create new assignment with the same problem
      const problemAssignment = queryRunner.manager.create(ApplicantProblem, {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
        problem: problem,
      });

      await queryRunner.manager.save(problemAssignment);

      return {
        message: 'Problem assigned by key',
        problemKey: problem.key,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
      };
    } catch (error) {
      return await this.assignRandomProblem(
        applicantId,
        attemptId,
        queryRunner,
      );
    }
  }

  // Assign random problem (fallback)
  private async assignRandomProblem(
    applicantId: string,
    attemptId: string,
    queryRunner: any,
  ): Promise<any> {
    try {
      const applicant = await queryRunner.manager.findOne(Applicant, {
        where: { id: applicantId },
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

      const problems = await queryRunner.manager.find(Problem, {
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
        test_attempt: { id: attemptId },
      });

      const problemAssignment = queryRunner.manager.create(ApplicantProblem, {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
        problem: selected,
      });

      await queryRunner.manager.save(problemAssignment);

      return {
        message: 'Random problem assigned',
        problemKey: selected.key,
        title: selected.title,
        description: selected.description,
        difficulty: selected.difficulty,
      };
    } catch (error) {
      throw error;
    }
  }

  private async assignProblemForPreview(
    applicantId: string,
    attemptId: string,
    queryRunner: any,
  ): Promise<any> {
    const applicant = await queryRunner.manager.findOne(Applicant, {
      where: { id: applicantId },
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

    const problems = await queryRunner.manager.find(Problem, {
      where: { difficulty },
      relations: ['functionSignatures', 'functionNames', 'testCases'],
    });

    if (!problems.length) {
      throw new NotFoundException(
        `No problems found for difficulty: ${difficulty}`,
      );
    }

    // For preview, select RANDOM problem
    const selected = problems[Math.floor(Math.random() * problems.length)];

    console.log(
      `Selected random problem for preview: ${selected.title} (${selected.key})`,
    );

    // Check if problem is already assigned
    const existingAssignment = await queryRunner.manager.findOne(
      ApplicantProblem,
      {
        where: {
          applicant: { id: applicantId },
          test_attempt: { id: attemptId },
        },
      },
    );

    if (existingAssignment) {
      existingAssignment.problem = selected;
      await queryRunner.manager.save(existingAssignment);
    } else {
      const applicantProblem = queryRunner.manager.create(ApplicantProblem, {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
        problem: selected,
      });
      await queryRunner.manager.save(applicantProblem);
    }

    return {
      message: 'Problem assigned',
      problemKey: selected.key,
      title: selected.title,
      description: selected.description,
      difficulty: selected.difficulty,
    };
  }

  //  get the assigned problem for preview
  async getAssignedProblemForPreview(
    applicantId: string,
    attemptId: string,
    languageId: string,
  ): Promise<any> {
    const record = await this.apRepo.findOne({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
      },
      relations: [
        'problem',
        'problem.functionSignatures',
        'problem.functionSignatures.language',
        'problem.functionNames',
        'problem.functionNames.language',
        'problem.testCases',
      ],
    });

    if (!record || !record.problem) {
      throw new NotFoundException(
        'No coding problem assigned for this test attempt',
      );
    }

    const problem = record.problem;

    const selectedSignature = problem.functionSignatures.find(
      (fs) => fs.language && fs.language.id === String(languageId),
    );

    const selectedFunctionName = problem.functionNames.find(
      (fn) => fn.language && fn.language.id === String(languageId),
    );

    return {
      problemKey: problem.key,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      functionSignature: selectedSignature?.signature ?? 'Signature not found',
      functionName: selectedFunctionName?.name ?? 'Function name not found',
      testCases: problem.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
      })),
    };
  }

  async getOneNewQuestionWithSameDifficulty(
    skillId: string,
    difficulty: 'easy' | 'medium' | 'hard',
    attemptId: string,
    excludeIds: string[],
  ): Promise<McqQuestion | null> {
    const query = this.questionRepo
      .createQueryBuilder('q')
      .leftJoin('q.skill', 'skill')
      .where('skill.id = :skillId', { skillId })
      .andWhere('q.difficulty = :difficulty', { difficulty });

    if (excludeIds.length > 0) {
      query.andWhere('q.id NOT IN (:...excludeIds)', { excludeIds });
    }

    const question = await query
      .leftJoinAndSelect('q.options', 'option')
      .leftJoinAndSelect('q.skill', 'skillRelation')
      .orderBy('RANDOM()')
      .getOne();

    return question ?? null;
  }

  async validateAndStartTest(token: string) {
    console.log('=== TOKEN VALIDATION START ===');
    console.log('Token received:', token);

    // Find token with detailed logging
    const tokenEntity = await this.tokenRepo.findOne({
      where: { token },
      relations: ['test_attempt', 'test_attempt.applicant'],
    });

    if (!tokenEntity) {
      throw new BadRequestException('Invalid or already used token');
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(tokenEntity.expires_at);

    if (now > expiresAt) {
      throw new BadRequestException('Test link has expired');
    }

    const applicant = tokenEntity.test_attempt.applicant;
    if (!applicant) {
      throw new NotFoundException('Applicant not found for this token');
    }

    return {
      message: 'Token is valid',
      attemptId: tokenEntity.test_attempt.id,
      applicantId: applicant.id,
    };
  }

  async sendTestEmail(emailDto: any) {
    // Validate email parameters first
    if (!emailDto.to || !emailDto.candidateName || !emailDto.testLink) {
      throw new BadRequestException('Missing required email parameters');
    }

    try {
      // Use your existing mail service to send the test link
      await this.mailService.sendTestLink(
        emailDto.to,
        emailDto.candidateName,
        emailDto.testLink,
      );

      return {
        statusCode: 200,
        message: 'Test link sent successfully to candidate',
      };
    } catch (error) {
      // Re-throw with more specific error message
      if (error.code === 'ESOCKET' || error.message?.includes('ETIMEDOUT')) {
        throw new InternalServerErrorException(
          'Failed to connect to email server. Please check your email configuration.',
        );
      } else if (error.code === 'EAUTH') {
        throw new InternalServerErrorException(
          'Email authentication failed. Please check your email credentials.',
        );
      } else {
        throw new InternalServerErrorException(
          `Failed to send test email: ${error.message}`,
        );
      }
    }
  }

  // cleanup method for preview data
  async cleanupPreviewData() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete preview applicant questions
      await queryRunner.manager.delete(ApplicantQuestion, {
        is_preview: true,
      });

      // Delete preview coding problems - fix this line
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from(ApplicantProblem)
        .where(
          'test_attempt_id IN (SELECT id FROM test_attempts WHERE is_preview = true)',
        )
        .execute();

      // Delete preview tokens
      await queryRunner.manager.delete(TestAccessToken, {
        is_preview: true,
      });

      // Delete preview attempts
      await queryRunner.manager.delete(TestAttempt, {
        is_preview: true,
      });

      // Delete preview applicants (those with preview email prefix)
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from(Applicant)
        .where("email LIKE 'preview-%'")
        .execute();

      await queryRunner.commitTransaction();

      return {
        statusCode: 200,
        message: 'Preview data cleaned up successfully',
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();

      throw err;
    } finally {
      await queryRunner.release();
    }
  }
  async markTokenAsUsed(token: string) {
    const tokenEntity = await this.tokenRepo.findOne({
      where: { token },
    });

    if (!tokenEntity) {
      return { message: 'Token not found' };
    }

    if (tokenEntity.is_used) {
      return { message: 'Token already used' };
    }

    tokenEntity.is_used = true;
    await this.tokenRepo.save(tokenEntity);

    return { message: 'Token marked as used successfully' };
  }
  // Add this method to the existing EvaluationService class
  async generateAITestLink(dto: any) {
    // We'll modify the DTO to indicate AI mode
    console.log('=== AI METHOD CALLED ===');
    console.log('Incoming DTO in AI method:', dto);
    const aiDto = {
      ...dto,
      mcq_mode: McqMode.AI,
      manual_mcqs: [], // No manual questions for AI mode
    };

    // Use the existing generatePreviewLink logic but mark as AI
    const result = await this.generatePreviewLink(aiDto);

    // Modify the response to indicate AI mode
    return {
      ...result,
      mcq_mode: McqMode.AI,
    };
  }
}
