import { Test, TestingModule } from '@nestjs/testing';
import { AiTestService } from './ai-test.service';

describe('AiTestService', () => {
  let service: AiTestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiTestService],
    }).compile();

    service = module.get<AiTestService>(AiTestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
