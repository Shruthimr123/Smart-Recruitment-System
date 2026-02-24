import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApplicantAnswer } from 'src/applicants/entities/applicant-answer.entity';
import { Applicant } from 'src/evaluation/entities/applicants.entity';
import { TestAccessToken } from 'src/evaluation/entities/test-access-token.entity';
import { TestAttempt } from 'src/evaluation/entities/test-attempt.entity';
import { Problem } from 'src/problem/entities/problem.entity';
import { Option } from 'src/question-bank/entities/option.entity';
import { McqQuestion } from 'src/question-bank/entities/question.entity';
import { Repository } from 'typeorm';
import { ApplicantProblem } from './entities/applicant_problem.entity';
import { ApplicantQuestion } from './entities/applicant_questions.entity';
import { EvaluationService } from 'src/evaluation/evaluation.service';

@Injectable()
export class ApplicantQuestionService {
  constructor(
    @InjectRepository(ApplicantQuestion)
    private readonly aqRepo: Repository<ApplicantQuestion>,

    @InjectRepository(ApplicantProblem)
    private readonly apRepo: Repository<ApplicantProblem>,

    @InjectRepository(ApplicantAnswer)
    private readonly answerRepo: Repository<ApplicantAnswer>,

    @InjectRepository(Option)
    private readonly optionRepo: Repository<Option>,

    @InjectRepository(TestAttempt)
    private readonly attemptRepo: Repository<TestAttempt>,

    @InjectRepository(TestAccessToken)
    private readonly tokenRepo: Repository<TestAccessToken>,

    private readonly evaluationService: EvaluationService,

    @InjectRepository(Problem)
    private readonly problemRepo: Repository<Problem>,

    @InjectRepository(Applicant)
    private readonly applicantRepo: Repository<Applicant>,
  ) {}

  async getAssignedQuestions(applicantId: string, attemptId: string) {

    // Get test attempt to check current count
    const testAttempt = await this.attemptRepo.findOne({
      where: { id: attemptId, applicant: { id: applicantId } },
      relations: ['applicant'],
    });

    if (!testAttempt) {
      throw new NotFoundException('Test attempt not found');
    }

    // Get questions without incrementing attempt count
    const questions = await this.aqRepo.find({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
      },
      relations: ['mcq_question', 'mcq_question.options', 'mcq_question.skill'],
      order: {
        id: 'ASC',
      },
    });



    return {
      questions: questions.map((q) => ({
        id: q.id,
        status: q.status,
        selectedOptionId: q.selected_option?.id || null,
        editable: q.status === 'not_visited' || q.status === 'skipped',
        mcq_question: {
          id: q.mcq_question.id,
          questionTitle: q.mcq_question.questionTitle,
          difficulty: q.mcq_question.difficulty,
          options: q.mcq_question.options,
          skill: q.mcq_question.skill,
        },
      })),
      attemptCount: testAttempt.attempt_count || 0,
      applicantName: testAttempt.applicant?.name || 'Applicant',
      applicantEmail: testAttempt.applicant?.email || '',
    };
  }

  async resumeTest(applicantId: string, attemptId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId },
      relations: [
        'applicant',
        'applicant.experience_level',
        'applicant.primary_skill',
        'applicant.secondary_skill',
      ],
    });

    if (!attempt) throw new NotFoundException('Test attempt not found');
    if (attempt.test_status === 'completed') {
      throw new BadRequestException('Test has already been submitted');
    }

    attempt.attempt_count = attempt.attempt_count ?? 1;
    if (attempt.attempt_count >= 3) {
      throw new BadRequestException('Max resume attempts exceeded');
    }

    attempt.attempt_count += 1;
    attempt.test_status = 'attending';
    if (!attempt.actual_applicant_answered_at) {
      attempt.actual_applicant_answered_at = new Date();
    }
    await this.attemptRepo.save(attempt);

    // STEP 1: Get all current question IDs before removing any
    const existingQuestions = await this.aqRepo.find({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
      },
      relations: ['mcq_question'],
    });
    const excludeQuestionIds = existingQuestions.map((q) => q.mcq_question.id);

    // STEP 2: Load all applicant questions fully
    let applicantQuestions = await this.aqRepo.find({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
      },
      relations: ['mcq_question', 'mcq_question.options', 'mcq_question.skill'],
      order: { id: 'ASC' },
    });

    // STEP 3: Replace first not_visited question (security improvement)
    if (attempt.attempt_count > 1) {
      const firstUnvisited = applicantQuestions.find(
        (q) => q.status === 'not_visited',
      );

      if (firstUnvisited) {
        const { skill, difficulty } = firstUnvisited.mcq_question;
        await this.aqRepo.remove([firstUnvisited]);

        const newQuestion =
          await this.evaluationService.getOneNewQuestionWithSameDifficulty(
            skill.id,
            difficulty,
            attemptId,
            excludeQuestionIds,
          );

        if (newQuestion) {
          const newAQ = this.aqRepo.create({
            applicant: { id: applicantId },
            test_attempt: { id: attemptId },
            mcq_question: newQuestion,
            status: 'not_visited',
          });
          await this.aqRepo.save(newAQ);
          excludeQuestionIds.push(newQuestion.id); // Add to excluded list
        }
      }
    }

    // STEP 4: Replace all skipped questions
    const skipped = applicantQuestions.filter((q) => q.status === 'skipped');

    if (skipped.length > 0) {
      const skippedInfo = skipped.map((q) => ({
        difficulty: q.mcq_question.difficulty as 'easy' | 'medium' | 'hard',
        skillId: q.mcq_question.skill.id,
      }));

      await this.aqRepo.remove(skipped);

      const newQuestions: McqQuestion[] = [];

      for (const { skillId, difficulty } of skippedInfo) {
        const newQ =
          await this.evaluationService.getOneNewQuestionWithSameDifficulty(
            skillId,
            difficulty,
            attemptId,
            excludeQuestionIds,
          );

        if (newQ) {
          newQuestions.push(newQ);
          excludeQuestionIds.push(newQ.id); // Track new ID
        }
      }

      const newAq = newQuestions.map((question) =>
        this.aqRepo.create({
          applicant: { id: applicantId },
          test_attempt: { id: attemptId },
          mcq_question: question,
          status: 'not_visited',
        }),
      );

      await this.aqRepo.save(newAq);
    }

    // STEP 5: Reload all questions
    applicantQuestions = await this.aqRepo.find({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
      },
      relations: ['mcq_question', 'mcq_question.options'],
    });

    // Sort: answered → skipped → not_visited
    applicantQuestions.sort((a, b) => {
      const order = { answered: 0, skipped: 1, not_visited: 2 };
      return order[a.status] - order[b.status];
    });

    const resumeFrom = applicantQuestions.find(
      (q) => q.status === 'not_visited' || q.status === 'skipped',
    );

    return {
      questions: applicantQuestions.map((q) => ({
        id: q.id,
        status: q.status,
        selectedOptionId: q.selected_option?.id ?? null,
        editable: q.status === 'not_visited' || q.status === 'skipped',
        mcq_question: q.mcq_question,
      })),
      lastSeenQuestion: resumeFrom?.mcq_question ?? null,
      attemptCount: attempt.attempt_count,
    };
  }

  // 3. Save or Update Answer
  async saveAnswer(
    applicantId: string,
    attemptId: string,
    questionId: string,
    selectedOptionId: string,
  ) {
    // Validate option
    const option = await this.optionRepo.findOne({
      where: { id: selectedOptionId },
      relations: ['mcqQuestion'],
    });

    if (!option || option.mcqQuestion.id !== questionId) {
      throw new NotFoundException('Invalid option selected');
    }

    // Get applicant_question entity
    const applicantQuestion = await this.aqRepo.findOne({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
        mcq_question: { id: questionId },
      },
    });

    if (!applicantQuestion) {
      throw new NotFoundException('Applicant question not found');
    }

    // Prevent resubmitting already answered
    if (applicantQuestion.status === 'answered') {
      throw new BadRequestException('You have already submitted this question');
    }

    // Save the answer
    const answer = this.answerRepo.create({
      applicant: { id: applicantId },
      test_attempt: { id: attemptId },
      mcq_question: { id: questionId },
      selected_option: option,
      answered_at: new Date(),
    });

    await this.answerRepo.save(answer);

    // Update question status to 'answered'
    applicantQuestion.status = 'answered';
    await this.aqRepo.save(applicantQuestion);

    return { message: 'Answer submitted successfully' };
  }

  async skipQuestion(
    applicantId: string,
    attemptId: string,
    questionId: string,
  ) {
    const applicantQuestion = await this.aqRepo.findOne({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
        mcq_question: { id: questionId },
      },
    });

    if (!applicantQuestion) {
      throw new NotFoundException('Applicant question not found');
    }

    // Prevent skipping already answered
    if (applicantQuestion.status === 'answered') {
      throw new BadRequestException('Cannot skip an already answered question');
    }

    // Update status to skipped
    applicantQuestion.status = 'skipped';
    await this.aqRepo.save(applicantQuestion);

    return { message: 'Question skipped successfully' };
  }

  // 4. View Submitted Answers
  async getAnswers(applicantId: string, attemptId: string) {
    return this.answerRepo.find({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
      },
      relations: ['mcq_question', 'selected_option'],
    });
  }

  // 5. Submit Test (evaluate score)
  async evaluateTest(applicantId: string, attemptId: string) {
    const answers = await this.answerRepo.find({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
      },
      relations: ['selected_option'],
    });

    const correct = answers.filter((a) => a.selected_option?.isCorrect).length;
    const total = answers.length;
    const wrong = total - correct;
    const percentage =
      total > 0 ? ((correct / total) * 100).toFixed(2) + '%' : '0%';

    await this.attemptRepo.update(
      { id: attemptId },
      {
        mcq_score: correct,
        test_status: 'completed',
        is_submitted: true,
        applicant_completed_at: new Date(),
      },
    );

    const token = await this.tokenRepo.findOne({
      where: { test_attempt: { id: attemptId } },
    });
    if (token) {
      token.is_used = true;
      await this.tokenRepo.save(token);
    }

    return {
      total,
      correct,
      wrong,
      percentage,
    };
  }

  async assignProblem(applicantId: string, attemptId: string): Promise<any> {
    const applicant = await this.applicantRepo.findOne({
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

    const attempt = await this.attemptRepo.findOneByOrFail({
      id: attemptId,
    });
    // const problem = await this.problemRepo.findOneByOrFail({ id: selected.id });
    const applicantProblem = this.apRepo.create({
      applicant,
      test_attempt: attempt,
      problem: selected,
    });
    await this.apRepo.save(applicantProblem);

    return {
      message: 'Problem assigned',
      problemKey: selected.key,
      title: selected.title,
      description: selected.description,
    };
  }

  async getAssignedProblem(
    applicantId: string,
    attemptId: string,
    languageId: string,
  ): Promise<any> {
    // First, try to find an existing assigned problem
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
      // If no problem is assigned, DO NOT auto-assign here
      // This ensures the same problem from generation is used
      throw new NotFoundException(
        'No coding problem assigned for this test attempt. Please contact administrator.',
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

  async getAttemptById(attemptId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException('Test attempt not found');
    }

    return attempt;
  }
  async startTestAndIncrementAttempt(applicantId: string, attemptId: string) {
    console.log('🎯 Starting test and incrementing attempt count:', {
      applicantId,
      attemptId,
    });

    // Find the test attempt
    const testAttempt = await this.attemptRepo.findOne({
      where: { id: attemptId, applicant: { id: applicantId } },
    });

    if (!testAttempt) {
      throw new NotFoundException('Test attempt not found');
    }

    console.log(
      '📊 Current attempt count before increment:',
      testAttempt.attempt_count,
    );

    // ✅ INCREMENT ATTEMPT COUNT
    testAttempt.attempt_count = (testAttempt.attempt_count || 0) + 1;
    testAttempt.test_status = 'attending';
    testAttempt.actual_applicant_answered_at = new Date();

    await this.attemptRepo.save(testAttempt);

    console.log('✅ Attempt count after increment:', testAttempt.attempt_count);

    // Get questions after incrementing attempt count
    const questions = await this.aqRepo.find({
      where: {
        applicant: { id: applicantId },
        test_attempt: { id: attemptId },
      },
      relations: ['mcq_question', 'mcq_question.options', 'mcq_question.skill'],
      order: {
        id: 'ASC',
      },
    });

    return {
      questions: questions.map((q) => ({
        id: q.id,
        status: q.status,
        selectedOptionId: q.selected_option?.id || null,
        editable: q.status === 'not_visited' || q.status === 'skipped',
        mcq_question: {
          id: q.mcq_question.id,
          questionTitle: q.mcq_question.questionTitle,
          difficulty: q.mcq_question.difficulty,
          options: q.mcq_question.options,
          skill: q.mcq_question.skill,
        },
      })),
      attemptCount: testAttempt.attempt_count,
      applicantName: testAttempt.applicant?.name || 'Applicant',
      applicantEmail: testAttempt.applicant?.email || '',
    };
  }
  
  async getAssignedProblemForApplicant(applicantId: string) {
    const problemAssignment = await this.apRepo.findOne({
      where: {
        applicant: { id: applicantId },
      },
      relations: [
        'problem',
        'problem.functionSignatures',
        'problem.functionSignatures.language',
        'problem.functionNames',
        'problem.functionNames.language',
        'problem.testCases',
      ],
      order: {
        created_at: 'DESC', // Now this will work since we added created_at to the entity
      },
    });

    if (!problemAssignment) {
      throw new NotFoundException(
        'No coding problem assigned for this applicant',
      );
    }

    const problem = problemAssignment.problem;

    // Get function signature for a default language (e.g., Python)
    const defaultSignature = problem.functionSignatures.find(
      (fs) => fs.language && fs.language.name === 'Python',
    );

    const defaultFunctionName = problem.functionNames.find(
      (fn) => fn.language && fn.language.name === 'Python',
    );

    return {
      problemKey: problem.key,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      functionSignature: defaultSignature?.signature,
      functionName: defaultFunctionName?.name,
      testCases: problem.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
      })),
    };
  }
}
