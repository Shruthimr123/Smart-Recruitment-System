import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
 
export class TestCaseDto {
  
  @IsObject()
  input: any
 
  @IsObject()
  expectedOutput: any;
 
   @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}
 
export class ParamDto {
  @IsString()
  name: string;
 
  @IsString()
  type: string;
 
  @IsOptional()
  @IsNumber()
  rows?: number;
 
  @IsOptional()
  @IsNumber()
  cols?: number;
}
 
export class LanguageConfigDto {
  @IsString()
  language: string;
 
  @IsString()
  signature: string;
 
  @IsString()
  functionName: string;
 
 
}
 
export class CreateProblemDto {
  @IsString()
  key: string;
 
  @IsString()
  title: string;
 
  @IsString()
  description: string;
 
  @IsString()
  userId: string;
 
  @IsEnum(['easy', 'medium', 'hard'], {
    message: 'Difficulty must be one of: easy, medium, hard',
  })
  difficulty: 'easy' | 'medium' | 'hard';
 
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageConfigDto)
  languageConfigs: LanguageConfigDto[];
 
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  testCases: TestCaseDto[];
}