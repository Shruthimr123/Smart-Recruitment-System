import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Malpractice } from './entities/malpractice.entity';
import { Applicant } from 'src/evaluation/entities/applicants.entity';

@Injectable()
export class MalpracticeService {
  constructor(
    @InjectRepository(Malpractice)
    private readonly repo: Repository<Malpractice>,
    @InjectRepository(Applicant)
    private readonly applicantRepo: Repository<Applicant>,
  ) {}

  // UPDATED: Register candidate with embedding
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

    // Find earliest record for this applicant
    const existingRecord = await this.repo.findOne({
      where: { applicant: { id: data.applicantId } },
      order: { timestamp: 'ASC' },
    });

    // If record exists AND has embedding, DO NOT overwrite
    if (existingRecord && existingRecord.embedding) {
      return {
        ...existingRecord,
        isExisting: true,
        message: 'Existing profile found - using stored embedding',
      };
    }

    // If record exists but embedding is null, update with new data
    if (existingRecord) {
      existingRecord.profileImageUrl = data.profileImageUrl;
      if (data.embedding) {
        existingRecord.embedding = data.embedding;
      }
      return this.repo.save(existingRecord);
    }

    // Create new record
    const record = this.repo.create({
      applicant,
      profileImageUrl: data.profileImageUrl,
      embedding: data.embedding,
    });

    return this.repo.save(record);
  }

  // NEW: Verify candidate identity
  async verifyCandidate(data: {
    applicantId: string;
    embedding: number[];
  }): Promise<{ verified: boolean; similarity: number }> {
    // Find earliest record with embedding
    const storedRecord = await this.repo.findOne({
      where: { applicant: { id: data.applicantId } },
      order: { timestamp: 'ASC' },
    });

    if (!storedRecord || !storedRecord.embedding) {
      throw new BadRequestException('No registered face found for this applicant');
    }

    const similarity = this.cosineSimilarity(storedRecord.embedding, data.embedding);
    
    return {
      verified: similarity >= 0.65,
      similarity,
    };
  }

  // NEW: Calculate cosine similarity between two embeddings
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

  async addAlert(data: {
    applicantId: string;
    alertMessage: string;
    malpracticeImageUrl: string;
  }): Promise<Malpractice> {
    // Find the first record for profile reference
    const profileRecord = await this.repo.findOne({
      where: { applicant: { id: data.applicantId } },
      order: { timestamp: 'ASC' },
      relations: ['applicant'],
    });

    if (!profileRecord) {
      throw new BadRequestException('Candidate not registered');
    }

    const alertRecord = this.repo.create({
      applicant: { id: data.applicantId } as Applicant,
      profileImageUrl: profileRecord.profileImageUrl,
      alertMessage: data.alertMessage,
      malpracticeImageUrl: data.malpracticeImageUrl,
      // Don't include embedding in alert records
    });

    return this.repo.save(alertRecord);
  }

  // Existing method for screen violations (unchanged)
  async addScreenViolation(data: {
    applicantId: string;
    alertMessage: string;
    malpracticeImageUrl: string;
  }): Promise<Malpractice> {
    return this.addAlert(data); // Reuse same logic
  }
}