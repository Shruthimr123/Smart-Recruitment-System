import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Applicant } from 'src/evaluation/entities/applicants.entity';
import { Repository } from 'typeorm';
 
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Applicant)
    private readonly applicantRepo: Repository<Applicant>,
  ) {}
 
  async dashboard() {
    const applicants = await this.applicantRepo.find({
      relations: [
        'experience_level',
        'primary_skill',
        'secondary_skill',
        'malpractice',
        'test_attempts',
        'test_attempts.job',
        'test_attempts.ta',
        'test_attempts.submissions',
        'submissions',
        'test_attempts.test_access_tokens',
      ],
    });
 
    return applicants;
  }
 
  async getApplicantById(id: string) {
  return this.applicantRepo.findOne({
    where: { id },
    relations: [
      'experience_level',
      'primary_skill',
      'secondary_skill',
      'malpractice',
      'test_attempts',
      'test_attempts.job',
      'test_attempts.test_access_tokens',
      'submissions',
    ],
  });
 
}
 
}