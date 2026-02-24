import { Test, TestingModule } from '@nestjs/testing';
import { AiTestController } from './ai-test.controller';
import { AiTestService } from './ai-test.service';

describe('AiTestController', () => {
  let controller: AiTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiTestController],
      providers: [AiTestService],
    }).compile();

    controller = module.get<AiTestController>(AiTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
