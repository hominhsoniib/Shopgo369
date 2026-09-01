import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Bảo mật cơ bản: validate toàn bộ input đầu vào (Mục 7.2 spec)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  // Swagger — tự sinh API spec (Mục 9.1 spec: 04-api-specification.md)
  const config = new DocumentBuilder()
    .setTitle('369 Platform API')
    .setDescription('API cho hệ sinh thái 369 — Phase 1: Nền tảng')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`369 Platform API đang chạy tại http://localhost:${port}/api/v1`);
  console.log(`Swagger docs tại http://localhost:${port}/api/docs`);
}
bootstrap();
