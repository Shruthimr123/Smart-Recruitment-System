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
    const applicants = await this.applicantRepo
      .createQueryBuilder('applicant')
      .leftJoinAndSelect('applicant.experience_level', 'experience_level')
      .leftJoinAndSelect('applicant.primary_skill', 'primary_skill')
      .leftJoinAndSelect('applicant.secondary_skill', 'secondary_skill')
      .leftJoinAndSelect('applicant.test_attempts', 'test_attempts')
      .leftJoinAndSelect('applicant.submissions', 'submissions')
      .leftJoinAndSelect('applicant.malpractice', 'malpractice')
      .orderBy('malpractice.timestamp', 'ASC')
      .getMany();
 
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
 
 