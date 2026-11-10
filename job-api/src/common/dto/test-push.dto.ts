import { IsOptional, IsString } from 'class-validator';

export class TestPushDto {
  @IsString()
  @IsOptional()
  token?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  url?: string;
}

