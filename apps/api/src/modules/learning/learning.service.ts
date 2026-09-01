import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  listPublishedCourses() {
    return this.prisma.learningCourse.findMany({
      where: { isPublished: true },
      include: { lessons: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async getCourseWithProgress(userId: string, courseId: string) {
    const course = await this.prisma.learningCourse.findUnique({
      where: { id: courseId },
      include: { lessons: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!course) throw new NotFoundException('Khoá học không tồn tại');

    const member = await this.prisma.member.findUnique({ where: { userId } });
    const completedLessonIds = member
      ? (
          await this.prisma.memberLessonCompletion.findMany({
            where: { memberId: member.id, lesson: { courseId } },
            select: { lessonId: true },
          })
        ).map((c) => c.lessonId)
      : [];

    return { ...course, completedLessonIds };
  }

  async completeLesson(userId: string, lessonId: string) {
    const member = await this.prisma.member.findUnique({ where: { userId } });
    if (!member) throw new ForbiddenException('Bạn cần là thành viên 369 để học khoá học này');

    const lesson = await this.prisma.learningLesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');

    return this.prisma.memberLessonCompletion.upsert({
      where: { memberId_lessonId: { memberId: member.id, lessonId } },
      update: {},
      create: { memberId: member.id, lessonId },
    });
  }

  // ── Admin quản lý nội dung khoá học ──────────────────────────────
  createCourse(data: { title: string; description?: string; coverUrl?: string }) {
    return this.prisma.learningCourse.create({ data });
  }

  publishCourse(courseId: string) {
    return this.prisma.learningCourse.update({ where: { id: courseId }, data: { isPublished: true } });
  }

  addLesson(courseId: string, data: { title: string; content?: string; videoUrl?: string; sortOrder?: number }) {
    return this.prisma.learningLesson.create({ data: { courseId, ...data } });
  }
}
