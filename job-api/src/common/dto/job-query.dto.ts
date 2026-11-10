import { IsOptional, IsString } from 'class-validator';

export class JobQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

