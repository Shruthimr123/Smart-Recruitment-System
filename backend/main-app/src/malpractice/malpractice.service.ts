import {
  BadRequestException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Malpractice } from './entities/malpractice.entity';
import { Applicant } from 'src/evaluation/entities/applicants.entity';

@Injectable()
export class MalpracticeService {
  constructor(
    @InjectRepository(Malpractice)
    private readonly repo: Repository<Malpractice>,
    @InjectRepository(Applicant)
    private readonly applicantRepo: Repository<Applicant>,
    private readonly dataSource: DataSource,
  ) {}

  async registerCandidate(data: {
    applicantId: string;
    profileImageUrl: string;
    embedding?: number[];
  }) {
    const applicant = await this.applicantRepo.findOne({
      where: { id: data.applicantId },
    });

    if (!applicant) {
      throw new BadRequestException('Applicant not found');
    }

    // Check if applicant is blocked
    if (applicant.is_blocked) {
      throw new ForbiddenException(
        'Applicant is permanently blocked due to violations',
      );
    }

    // Find earliest record for this applicant
    const existingRecord = await this.repo.findOne({
      where: { applicant: { id: data.applicantId } },
      order: { timestamp: 'ASC' },
    });

    if (existingRecord && existingRecord.embedding) {
      return {
        ...existingRecord,
        isExisting: true,
        message: 'Existing profile found - using stored embedding',
        totalViolations: applicant.total_violations,
        isBlocked: applicant.is_blocked,
      };
    }

    if (existingRecord) {
      existingRecord.profileImageUrl = data.profileImageUrl;
      if (data.embedding) {
        existingRecord.embedding = data.embedding;
      }
      const saved = await this.repo.save(existingRecord);
      return {
        ...saved,
        totalViolations: applicant.total_violations,
        isBlocked: applicant.is_blocked,
      };
    }

    const record = this.repo.create({
      applicant,
      profileImageUrl: data.profileImageUrl,
      embedding: data.embedding,
    });

    const saved = await this.repo.save(record);
    return {
      ...saved,
      totalViolations: applicant.total_violations,
      isBlocked: applicant.is_blocked,
    };
  }

  async verifyCandidate(data: {
    applicantId: string;
    embedding: number[];
  }): Promise<{
    verified: boolean;
    similarity: number;
    totalViolations: number;
    isBlocked: boolean;
  }> {
    const applicant = await this.applicantRepo.findOne({
      where: { id: data.applicantId },
    });

    if (!applicant) {
      throw new BadRequestException('Applicant not found');
    }

    // Check if applicant is blocked
    if (applicant.is_blocked) {
      throw new ForbiddenException(
        'Applicant is permanently blocked due to violations',
      );
    }

    const storedRecord = await this.repo.findOne({
      where: { applicant: { id: data.applicantId } },
      order: { timestamp: 'ASC' },
    });
    ``;

    if (!storedRecord || !storedRecord.embedding) {
      throw new BadRequestException(
        'No registered face found for this applicant',
      );
    }

    const similarity = this.cosineSimilarity(
      storedRecord.embedding,
      data.embedding,
    );

    return {
      verified: similarity >= 0.65,
      similarity,
      totalViolations: applicant.total_violations,
      isBlocked: applicant.is_blocked,
    };
  }

  async addAlert(data: {
    applicantId: string;
    alertMessage: string;
    malpracticeImageUrl: string;
  }): Promise<{
    alert: Malpractice;
    totalViolations: number;
    isBlocked: boolean;
    maxReached: boolean;
  }> {
    // Use transaction to ensure data consistency
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find applicant with lock
      const applicant = await queryRunner.manager.findOne(Applicant, {
        where: { id: data.applicantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!applicant) {
        throw new BadRequestException('Applicant not found');
      }

      // Check if already blocked
      if (applicant.is_blocked) {
        throw new ForbiddenException('APPLICANT_BLOCKED');
      }

      // Find the first record for profile reference
      const profileRecord = await queryRunner.manager.findOne(Malpractice, {
        where: { applicant: { id: data.applicantId } },
        order: { timestamp: 'ASC' },
        relations: ['applicant'],
      });

      if (!profileRecord) {
        throw new BadRequestException('Candidate not registered');
      }

      // Create alert record
      const alertRecord = queryRunner.manager.create(Malpractice, {
        applicant: { id: data.applicantId } as Applicant,
        profileImageUrl: profileRecord.profileImageUrl,
        alertMessage: data.alertMessage,
        malpracticeImageUrl: data.malpracticeImageUrl,
      });

      const savedAlert = await queryRunner.manager.save(alertRecord);

      // Increment total violations
      applicant.total_violations += 1;

      // Check if reached max violations
      let maxReached = false;
      if (applicant.total_violations >= 7) {
        applicant.is_blocked = true;
        applicant.blocked_at = new Date();
        maxReached = true;

        // Find and terminate any active test attempt
        const activeAttempt = await queryRunner.manager
          .createQueryBuilder('test_attempts', 'attempt')
          .where('attempt.applicant_id = :applicantId', {
            applicantId: applicant.id,
          })
          .andWhere('attempt.test_status = :status', { status: 'attending' })
          .andWhere('attempt.is_submitted = :isSubmitted', {
            isSubmitted: false,
          })
          .getOne();

        if (activeAttempt) {
          // Update using query builder to avoid type issues
          await queryRunner.manager
            .createQueryBuilder()
            .update('test_attempts')
            .set({
              is_submitted: true,
              test_status: 'completed',
              applicant_completed_at: new Date(),
            })
            .where('id = :id', { id: activeAttempt.id })
            .execute();
        }
      }

      await queryRunner.manager.save(applicant);
      await queryRunner.commitTransaction();

      return {
        alert: savedAlert,
        totalViolations: applicant.total_violations,
        isBlocked: applicant.is_blocked,
        maxReached,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getViolationStatus(applicantId: string): Promise<{
    totalViolations: number;
    isBlocked: boolean;
    remainingAttempts?: number;
  }> {
    const applicant = await this.applicantRepo.findOne({
      where: { id: applicantId },
    });

    if (!applicant) {
      throw new BadRequestException('Applicant not found');
    }

    // Calculate remaining attempts 
    const remainingAttempts = applicant.is_blocked
      ? 0
      : Math.max(0, 3 - (await this.getAttemptCount(applicantId)));

    return {
      totalViolations: applicant.total_violations, 
      isBlocked: applicant.is_blocked,
      remainingAttempts,
    };
  }

  //Get attempt count
  private async getAttemptCount(applicantId: string): Promise<number> {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('test_attempts', 'attempt')
      .where('attempt.applicant_id = :applicantId', { applicantId })
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }

  async addScreenViolation(data: {
    applicantId: string;
    alertMessage: string;
    malpracticeImageUrl: string;
  }): Promise<any> {
    return this.addAlert(data);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new BadRequestException('Embedding dimensions do not match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
