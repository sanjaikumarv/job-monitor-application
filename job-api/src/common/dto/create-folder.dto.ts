import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  path!: string;

  @IsBoolean()
  @IsOptional()
  recursive?: boolean = true;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

