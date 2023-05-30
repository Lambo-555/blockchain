import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('ethereum')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/max-ballance-change-address')
  async getMaxBalanceChangeAddress(): Promise<string> {
    const address = await this.appService.getMaxBalanceChangeAddress();
    return address;
  }
}
