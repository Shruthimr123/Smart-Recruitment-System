import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Problem } from './entities/problem.entity';
import { FunctionSignature } from './entities/function-signature.entity';
import { FunctionName } from './entities/function-name.entity';
import { TestCase } from './entities/test-case.entity';
import { Language } from './entities/language.entity';
import { CreateProblemDto } from 'src/execute/dto/create-problem.dto';
 
@Injectable()
export class ProblemService {
  constructor(
    @InjectRepository(Problem)
    private readonly problemRepo: Repository<Problem>,
 
    @InjectRepository(FunctionSignature)
    private readonly signatureRepo: Repository<FunctionSignature>,
 
    @InjectRepository(FunctionName)
    private readonly nameRepo: Repository<FunctionName>,
 
    @InjectRepository(TestCase)
    private readonly testCaseRepo: Repository<TestCase>,
 
    @InjectRepository(Language)
    private readonly languageRepo: Repository<Language>,
  ) {}
 
  
  async getProblemForExecution(problemKey: string, languageName: string) {
    const problem = await this.problemRepo.findOne
    ({ where: { key: problemKey },
      relations: [
        'functionSignatures',
         'functionSignatures.language',
          'functionNames',
          'testCases'
        ],
       });
    if (!problem) throw new NotFoundException(`Problem with key '${problemKey}' not found`);
 
    const language = await this.languageRepo.findOne({ where: { name: languageName } });
    if (!language) throw new NotFoundException(`Language '${languageName}' not supported`);
 
    // Find signature & function name for this language
  const signatureMeta = problem.functionSignatures.find(
    (fs) => fs.languageId === language.id,
  );
 
   const fnNameMeta = problem.functionNames.find(
    (fn) => fn.languageId === language.id,
  );
   
 
    const testCases = await this.testCaseRepo.find({
      where: { problemId: problem.id },
      order: { id: 'ASC' },
    });
 
    if (!signatureMeta || !fnNameMeta) {
      throw new NotFoundException(
        `Signature or function name not found for problem '${problemKey}' in language '${languageName}'`
      );
    }
 
    return {
      problemId: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty, 
      signature: signatureMeta.signature,
      functionName: fnNameMeta.name,
      testCases
    };
  }

  async getAllProblems() {
    const problems = await this.problemRepo.find({
      relations: [
        'functionSignatures',
        'functionNames',
        'testCases',
        'functionSignatures.language',
        'functionNames.language',
      ],
      order: { id: 'ASC' },
    });
 
    return problems.map(problem => {
      const languageConfigs: {
        language: string;
        signature: string;
        functionName: string;
      }[] = [];
 
      for (const sig of problem.functionSignatures) {
        const lang = sig.language?.name;
        const name = problem.functionNames.find(
          fn => fn.languageId === sig.languageId,
        );
        if (lang && name) {
          languageConfigs.push({
            language: lang,
            signature: sig.signature,
            functionName: name.name,
          });
        }
      }
 
      return {
        key: problem.key,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty, 
        languageConfigs,
        testCases: problem.testCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      };
    });
  }
 
  
  async addProblem(dto: CreateProblemDto) {
    const { key, title, description, difficulty,userId, languageConfigs, testCases } = dto;
 
    const existing = await this.problemRepo.findOne({ where: { key } });
    if (existing) throw new Error(`Problem with key '${key}' already exists`);
 
    const problem = this.problemRepo.create({ key, title, description, difficulty, createdBy: {id:userId} }); // ✅ save difficulty
    await this.problemRepo.save(problem);
 
    for (const lang of languageConfigs) {
      const language = await this.languageRepo.findOne({ where: { name: lang.language } });
      if (!language) throw new Error(`Language '${lang.language}' not found`);
 
      const signature = this.signatureRepo.create({
        problemId: problem.id,
        languageId: language.id,
        signature: lang.signature,
       
      });
 
      const functionName = this.nameRepo.create({
        problemId: problem.id,
        languageId: language.id,
        name: lang.functionName,
      });
 
      await this.signatureRepo.save(signature);
      await this.nameRepo.save(functionName);
    }
 
    for (const tc of testCases) {
      const testCase = this.testCaseRepo.create({
        problemId: problem.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      });
 
      await this.testCaseRepo.save(testCase);
    }
 
    return { message: 'Problem added successfully', problemId: problem.id };
  }
}
 