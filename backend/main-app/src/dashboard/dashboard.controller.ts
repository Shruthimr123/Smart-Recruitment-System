import { Controller, Get, Param, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { DashboardService } from './dashboard.service';
import * as ExcelJS from 'exceljs';
 
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
 
  @Get()
  async dashboard() {
    const data = await this.dashboardService.dashboard();
 
    return {
      statusCode: '200',
      message: 'Dashboard data retrieved successfully.',
      data: data,
    };
  }

  @Get('report')
  async downloadAllReports(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response
  ) {
    const data = await this.dashboardService.dashboard();
 
    let filteredData = data;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
 
      filteredData = data.filter(candidate => {

        const testAttempt = candidate.test_attempts?.[0];
        let candidateDate: Date;
 
        if (testAttempt?.created_at) {
          candidateDate = new Date(testAttempt.created_at);
        } else if (testAttempt?.actual_applicant_answered_at) {
          candidateDate = new Date(testAttempt.actual_applicant_answered_at);
        } else if (testAttempt?.applicant_completed_at) {
          candidateDate = new Date(testAttempt.applicant_completed_at);
        } else if (testAttempt?.schedule_start) {
          candidateDate = new Date(testAttempt.schedule_start);
        } else {
          return true;
        }
 
        return candidateDate >= start && candidateDate <= end;
      });
    }
 
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('All Candidates');

    sheet.addRow([
      'Date',
      'Candidate Name',
      'Email ID',
      'Phone Number',
      'Experience Level',
      'Attempts Count',
      'Started At',
      'Completed At',
      'Test Duration',
      'MCQ Score',
      'Coding Score',
      'Percentage',
      'Result',
      'Profile Link',
    ]);
 
    const currentDate = new Date().toLocaleDateString();
 
    filteredData.forEach((c) => {
      const testAttempt = c?.test_attempts?.[0] ?? null;
      const mcqScore = testAttempt?.mcq_score ?? 0;
      const totalMcqQuestions = 30;
     
      const codingSubmission = c?.submissions?.[0] ?? null;
      const passedTests = codingSubmission?.testResults?.filter((tr) => tr.passed)?.length ?? 0;
      const totalTests = codingSubmission?.testResults?.length ?? 0;
     

      const mcqPercentage = totalMcqQuestions > 0 ? ((mcqScore / totalMcqQuestions) * 100) : 0;

      let codingPercentage: number;
      if (passedTests > 0) {
        codingPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100) : 0;
      } else {
        codingPercentage = mcqPercentage;
      }
     

      const overallPercentage = ((mcqPercentage + codingPercentage) / 2).toFixed(2);
     

      const isPassed = mcqScore > 20 && passedTests > 0 ? 'Passed' : 'Failed';
 
      const candidateDate = this.getCandidateDate(c);
 
      sheet.addRow([
        candidateDate.toLocaleDateString(),
        c?.name ?? 'N/A',
        c?.email ?? 'N/A',
        c?.phone ?? 'N/A',
        c?.experience_level?.name ?? 'N/A',
        testAttempt?.attempt_count ?? 'N/A',
        testAttempt?.actual_applicant_answered_at
          ? new Date(testAttempt.actual_applicant_answered_at).toLocaleString()
          : 'N/A',
        testAttempt?.applicant_completed_at
          ? new Date(testAttempt.applicant_completed_at).toLocaleString()
          : 'N/A',
        testAttempt?.total_duration_minutes ?? 'N/A',
        `${mcqScore}/${totalMcqQuestions}`,
        `${passedTests}/${totalTests}`,
        `${overallPercentage}%`,
        isPassed,
        c?.id ? `http://localhost:5173/applicant-info/${c.id}` : 'N/A',
      ]);
    });
 

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' } 
    };

    sheet.columns.forEach(column => {
      column.width = 15;
    });

    sheet.getColumn(2).width = 20; // Candidate Name
    sheet.getColumn(3).width = 25; // Email ID
    sheet.getColumn(7).width = 20; // Started At
    sheet.getColumn(8).width = 20; // Completed At
    sheet.getColumn(14).width = 30; // Profile Link
 
    const dateSuffix = startDate && endDate ? `_${startDate}_to_${endDate}` : '_all';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="candidates${dateSuffix}.xlsx"`,
    );
 
    await workbook.xlsx.write(res);
    res.end();
  }
 
  // Download Excel for a single candidate
  @Get('report/:id')
  async downloadSingleReport(@Param('id') id: string, @Res() res: Response) {
    const c = (await this.dashboardService.dashboard()).find(
      (cand) => cand?.id === id,
    );
 
    if (!c) {
      return res.status(404).send('Candidate not found');
    }
 
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Candidate Report');
 
    // Updated Header row - using the same percentage calculation as React
    sheet.addRow([
      'Candidate Name',
      'Email ID',
      'Phone Number',
      'Experience Level',
      'Job Title',
      'Client Name',
      'Primary Skill',
      'Secondary Skill',
      'Attempts Count',
      'MCQ Score',
      'Coding Score',
      'Percentage',
      'Schedule Start',
      'Schedule End',
      'Started At',
      'Completed At',
      'Total Duration',
      'MCQ Duration',
      'Coding Duration',
      'Result',
      'Application Date',
    ]);
 
    const testAttempt = c?.test_attempts?.[0] ?? null;
    const mcqScore = testAttempt?.mcq_score ?? 0;
    const totalMcqQuestions = 30;
   
    const codingSubmission = c?.submissions?.[0] ?? null;
    const passedTests = codingSubmission?.testResults?.filter((tr) => tr.passed)?.length ?? 0;
    const totalTests = codingSubmission?.testResults?.length ?? 0;
   
 
    const mcqPercentage = totalMcqQuestions > 0 ? ((mcqScore / totalMcqQuestions) * 100) : 0;
   

    let codingPercentage: number;
    if (passedTests > 0) {
      codingPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100) : 0;
    } else {
      codingPercentage = mcqPercentage; 
    }
   
    
    const overallPercentage = ((mcqPercentage + codingPercentage) / 2).toFixed(2);
   
    const isPassed = mcqScore > 20 && passedTests > 0 ? 'Passed' : 'Failed';
    const applicationDate = this.getCandidateDate(c);
 

    const safeName = (c.name ?? 'unknown').replace(/[\/\\?%*:|"<>]/g, '-');
 
    sheet.addRow([
      c.name ?? 'N/A',
      c.email ?? 'N/A',
      c.phone ?? 'N/A',
      c.experience_level?.name ?? 'N/A',
      testAttempt?.job?.title ?? 'N/A',
      testAttempt?.job?.clientName ?? 'N/A',
      c.primary_skill?.name ?? 'N/A',
      c.secondary_skill?.name ?? 'N/A',
      testAttempt?.attempt_count ?? 'N/A',
      `${mcqScore}/${totalMcqQuestions}`,
      `${passedTests}/${totalTests}`,
      `${overallPercentage}%`,
      testAttempt?.schedule_start
        ? new Date(testAttempt.schedule_start).toLocaleString()
        : 'N/A',
      testAttempt?.schedule_end
        ? new Date(testAttempt.schedule_end).toLocaleString()
        : 'N/A',
      testAttempt?.actual_applicant_answered_at
        ? new Date(testAttempt.actual_applicant_answered_at).toLocaleString()
        : 'N/A',
      testAttempt?.applicant_completed_at
        ? new Date(testAttempt.applicant_completed_at).toLocaleString()
        : 'N/A',
      testAttempt?.total_duration_minutes ?? 'N/A',
      testAttempt?.mcq_duration_minutes ?? 'N/A',
      testAttempt?.coding_duration_minutes ?? 'N/A',
      isPassed,
      applicationDate.toLocaleDateString(),
    ]);
 

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
 

    sheet.columns.forEach(column => {
      column.width = 15;
    });
 
    
    sheet.getColumn(1).width = 20; // Candidate Name
    sheet.getColumn(2).width = 25; // Email ID
    sheet.getColumn(13).width = 20; // Schedule Start
    sheet.getColumn(14).width = 20; // Schedule End
    sheet.getColumn(15).width = 20; // Started At
    sheet.getColumn(16).width = 20; // Completed At
 
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="candidate_${safeName}.xlsx"`,
    );
 
    await workbook.xlsx.write(res);
    res.end();
  }

  private getCandidateDate(candidate: any): Date {
    const testAttempt = candidate.test_attempts?.[0];
   
    if (testAttempt?.created_at) {
      return new Date(testAttempt.created_at);
    } else if (testAttempt?.actual_applicant_answered_at) {
      return new Date(testAttempt.actual_applicant_answered_at);
    } else if (testAttempt?.applicant_completed_at) {
      return new Date(testAttempt.applicant_completed_at);
    } else if (testAttempt?.schedule_start) {
      return new Date(testAttempt.schedule_start);
    } else {
      return new Date(); 
    }
  }
}