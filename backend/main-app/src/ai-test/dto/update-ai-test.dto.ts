import { PartialType } from '@nestjs/swagger';
import { CreateAiTestDto } from './create-ai-test.dto';

export class UpdateAiTestDto extends PartialType(CreateAiTestDto) {}
