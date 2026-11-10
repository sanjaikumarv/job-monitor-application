import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateFolderDto } from '../../common/dto/create-folder.dto.js';
import type { FolderConfig, MonitoringStatus } from '../../common/interfaces/folder.interface.js';
import { FoldersService } from './folders.service.js';

@Controller('api/folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  public async create(@Body() dto: CreateFolderDto): Promise<FolderConfig> {
    return this.foldersService.create(dto);
  }

  @Get()
  public async findAll(): Promise<FolderConfig[]> {
    return this.foldersService.findAll();
  }

  @Get('browse')
  public async browse(
    @Query('path') dirPath?: string,
  ): Promise<{
    currentPath: string;
    parentPath?: string;
    directories: Array<{ name: string; path: string }>;
  }> {
    return this.foldersService.browseDirectories(dirPath);
  }

  @Get(':id')
  public async findOne(@Param('id') id: string): Promise<FolderConfig> {
    return this.foldersService.findById(id);
  }

  @Patch(':id/activate')
  public async activate(@Param('id') id: string): Promise<FolderConfig> {
    return this.foldersService.activate(id);
  }

  @Patch(':id/deactivate')
  public async deactivate(@Param('id') id: string): Promise<FolderConfig> {
    return this.foldersService.deactivate(id);
  }

  @Delete(':id')
  public async remove(@Param('id') id: string): Promise<{ success: boolean; id: string }> {
    return this.foldersService.remove(id);
  }

  @Get(':id/status')
  public getStatus(@Param('id') id: string): { id: string; status: MonitoringStatus } {
    return {
      id,
      status: this.foldersService.getStatus(id),
    };
  }
}
