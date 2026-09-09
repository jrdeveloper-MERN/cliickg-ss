import {
  Controller, Get, Query, Res, UseGuards, BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }

  @Get(['payment/dashboard-metrics', 'dashboard/payment-stats'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async getPaymentDashboardMetrics() {
    return this.dashboardService.getPaymentDashboardMetrics();
  }

  @Get('payment/reports/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  async exportPaymentReportCsv(@Query() query: DashboardQueryDto, @Res() res: Response) {
    const format = (query.format || 'csv').toLowerCase();
    if (format !== 'csv') {
      throw new BadRequestException(`Export format '${format}' is not supported. Supported format: 'csv'`);
    }

    const csvContent = await this.dashboardService.exportPaymentReportCsv();
    const filename = `Payment_Transactions_Report_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  }
}
