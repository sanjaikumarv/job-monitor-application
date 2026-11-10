import { IsOptional, IsString } from 'class-validator';

export class BroadcastPushDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

