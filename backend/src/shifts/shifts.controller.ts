import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BatchShiftsDto } from './dto/batch-shifts.dto';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { ShiftInputDto } from './dto/shift-input.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('preview')
  preview(@Body() dto: ShiftInputDto) {
    return this.shiftsService.preview(dto);
  }

  @Post('preview-batch')
  previewBatch(@Body() dto: BatchShiftsDto) {
    return this.shiftsService.previewBatch(dto);
  }

  @Post('clock-in')
  clockIn(@Body() dto: ClockInDto) {
    return this.shiftsService.clockIn(dto);
  }

  @Post('clock-out')
  clockOut(@Body() dto: ClockOutDto) {
    return this.shiftsService.clockOut(dto);
  }

  @Get('open/:workerId')
  findOpen(@Param('workerId', ParseUUIDPipe) workerId: string) {
    return this.shiftsService.findOpenForWorker(workerId);
  }

  @Post()
  create(@Body() dto: ShiftInputDto) {
    return this.shiftsService.create(dto);
  }

  @Post('batch')
  createBatch(@Body() dto: BatchShiftsDto) {
    return this.shiftsService.createBatch(dto);
  }

  @Get()
  findAll(@Query() query: QueryShiftsDto) {
    return this.shiftsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateShiftDto) {
    return this.shiftsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.remove(id);
  }
}
