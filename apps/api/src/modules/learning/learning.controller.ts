import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LearningService } from './learning.service';

class CreateCourseDto {
  @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() coverUrl?: string;
}

class AddLessonDto {
  @IsNotEmpty() title: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

@ApiTags('learning')
@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('courses')
  listCourses() {
    return this.learningService.listPublishedCourses();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('courses/:id')
  getCourse(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.learningService.getCourseWithProgress(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('lessons/:id/complete')
  completeLesson(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.learningService.completeLesson(user.id, id);
  }

  // ── Admin quản lý nội dung ──────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('courses')
  createCourse(@Body() dto: CreateCourseDto) {
    return this.learningService.createCourse(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('courses/:id/publish')
  publishCourse(@Param('id') id: string) {
    return this.learningService.publishCourse(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('courses/:id/lessons')
  addLesson(@Param('id') courseId: string, @Body() dto: AddLessonDto) {
    return this.learningService.addLesson(courseId, dto);
  }
}
