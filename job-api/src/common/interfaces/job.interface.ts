export interface JobRecord {
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  employmentType: string;
  experience: string;
  salary: string;
  description: string;
  applicationUrl: string;
  postedAt: string;
  skills: string[];
  source: string;
  platform?: string;
  workMode?: string;
  matchScore?: string | number;
  matchExplanation?: string;
  discoveredAt?: string;
  applicationStatus?: string;
  sourceFolderId?: string;
  sourceFileName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobQueryDto {
  search?: string;
  location?: string;
  company?: string;
  page?: number;
  limit?: number;
}

