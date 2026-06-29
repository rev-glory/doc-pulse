import { IsString, IsOptional, MinLength } from "class-validator";

export class ReviewDecisionDto {
  @IsString()
  @IsOptional()
  comment?: string;
}
