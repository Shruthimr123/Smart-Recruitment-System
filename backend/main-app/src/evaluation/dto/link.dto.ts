import { IsEnum, IsOptional } from 'class-validator';

export enum McqMode {
  MANUAL = 'manual',
  AI = 'ai',
}

export class GenerateTestLinkDto {
  applicant_id: string;
  name: string;
  email: string;
  phone: string;
  experience_level_id: string;
  primary_skill_id: string;
  secondary_skill_id?: string;
  job_id: string;
  ta_id: string;
  manual_mcqs?: string[];       
  auto_mcqs_count?: number;  
  previewProblemKey?: string;
  previewAttemptId?: string;

  @IsOptional()
  @IsEnum(McqMode)
  mcq_mode?: McqMode;
}

export class SaveAnswerDto {
  applicant_id: string;
  test_attempt_id: string;
  mcq_question_id: string;
  selected_option_id: string;
}
