import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SettlementQueryDto } from './dto/settlement-query.dto';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('settlements/preview')
  preview(@Query() query: SettlementQueryDto) {
    return this.paymentsService.preview(query);
  }

  @Post('payments')
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Get('payments')
  findAll(@Query('workerId') workerId?: string) {
    return this.paymentsService.findAll(workerId);
  }
}
