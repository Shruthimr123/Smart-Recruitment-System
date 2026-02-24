export class CreateSubmissionDto {
  applicantId: string;
  problemKey: string;
  code: string;
  output: string;
  status: string; 
  testResults: any;
  isAutoSubmitted?: boolean;
}
