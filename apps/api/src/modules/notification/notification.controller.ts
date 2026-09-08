import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ---- Device token (mobile app đăng ký khi login / gỡ khi logout) ----

  @Post('device-tokens')
  registerDeviceToken(@CurrentUser() user: { id: string }, @Body() dto: RegisterDeviceTokenDto) {
    return this.notificationService.registerDeviceToken(user.id, dto.token, dto.platform);
  }

  @Delete('device-tokens/:token')
  unregisterDeviceToken(@CurrentUser() user: { id: string }, @Param('token') token: string) {
    return this.notificationService.unregisterDeviceToken(user.id, token);
  }

  // ---- Preferences — đặt TRƯỚC ":id/read" để không bị GET/:id nuốt path ----

  @Get('preferences')
  getPreferences(@CurrentUser() user: { id: string }) {
    return this.notificationService.getPreferences(user.id);
  }

  @Patch('preferences')
  updatePreferences(@CurrentUser() user: { id: string }, @Body() dto: UpdatePreferencesDto) {
    return this.notificationService.updatePreferences(user.id, dto);
  }

  // ---- In-app inbox ----

  @Get()
  getMyNotifications(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notificationService.getMyNotifications(
      user.id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Patch(':id/read')
  markAsRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationService.markAsRead(user.id, id);
  }

  @Post('read-all')
  markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.notificationService.markAllAsRead(user.id);
  }
}
