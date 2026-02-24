import { PartialType } from '@nestjs/swagger'; 
import { CreateMalpracticeDto } from './create-malpractice.dto';

export class UpdateMalpracticeDto extends PartialType(CreateMalpracticeDto) {}