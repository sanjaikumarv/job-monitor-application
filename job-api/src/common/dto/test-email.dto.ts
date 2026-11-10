import { IsEmail, IsOptional, IsString } from 'class-validator';

export class TestEmailDto {
  @IsEmail()
  @IsOptional()
  to?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  message?: string;
}

