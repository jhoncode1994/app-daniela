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

  @Post()
  create(@Body() dto: ShiftInputDto) {
    return this.shiftsService.create(dto);
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
