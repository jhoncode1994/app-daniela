import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
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

  @Delete('payments/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.remove(id);
  }

  @Get('payments')
  findAll(@Query('workerId') workerId?: string, @Query('providerId') providerId?: string) {
    return this.paymentsService.findAll(workerId, providerId);
  }
}
