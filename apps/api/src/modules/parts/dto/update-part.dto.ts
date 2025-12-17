/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        UPDATE PART DTO — Validation pour mise à jour de pièce                      ║
 * ║  Tous les champs sont optionnels (mise à jour partielle PATCH)                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import {
  IsString,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  IsEnum,
  IsOptional,
  IsArray,
  ArrayMinSize,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PartConditionDto, PartStatusDto } from './create-part.dto';

/**
 * [1] UpdatePartDto
 *     Mise à jour partielle d'une pièce (PATCH)
 *     Tous les champs sont optionnels
 *     Si oemRefs ou engineIds fournis, doivent avoir au moins 1 élément
 */
export class UpdatePartDto {
  @ApiPropertyOptional({
    description: 'Titre de la pièce',
    example: 'Filtre à huile Bosch 0986AF0250',
    minLength: 3,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Description détaillée',
    example: 'Filtre à huile compatible Toyota, Honda. État neuf, jamais utilisé.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Prix en XOF (Franc CFA)',
    example: 15000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  @IsPositive({ message: 'Le prix doit être supérieur à 0' })
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({
    description: 'Devise',
    example: 'XOF',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'La devise doit être un code ISO 4217 (ex: XOF, EUR)' })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Quantité en stock',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Le stock doit être un entier' })
  @Min(0, { message: 'Le stock ne peut pas être négatif' })
  @Type(() => Number)
  stock?: number;

  @ApiPropertyOptional({
    description: 'État de la pièce',
    enum: PartConditionDto,
    example: PartConditionDto.USED_GOOD,
  })
  @IsOptional()
  @IsEnum(PartConditionDto, { message: 'État invalide' })
  condition?: PartConditionDto;

  @ApiPropertyOptional({
    description: 'Statut de publication',
    enum: PartStatusDto,
  })
  @IsOptional()
  @IsEnum(PartStatusDto, { message: 'Statut invalide' })
  status?: PartStatusDto;

  @ApiPropertyOptional({
    description: 'Références OEM (remplace les existantes)',
    example: ['0986AF0250', '15400-PLM-A01'],
    minItems: 1,
  })
  @IsOptional()
  @IsArray({ message: 'Les références OEM doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Au moins 1 référence OEM est obligatoire si fourni' })
  @IsString({ each: true, message: 'Chaque référence OEM doit être une chaîne' })
  oemRefs?: string[];

  @ApiPropertyOptional({
    description: 'IDs des motorisations compatibles (remplace les existantes)',
    example: ['clxyz123...', 'clxyz456...'],
    minItems: 1,
  })
  @IsOptional()
  @IsArray({ message: 'Les motorisations doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Au moins 1 motorisation compatible est obligatoire si fourni' })
  @IsString({ each: true, message: 'Chaque ID de motorisation doit être une chaîne' })
  engineIds?: string[];

  @ApiPropertyOptional({
    description: 'Ville de localisation',
    example: 'Lomé',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Code pays ISO 3166-1 alpha-2',
    example: 'TG',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'Le code pays doit être au format ISO 3166-1 alpha-2 (ex: TG, BJ)',
  })
  country?: string;
}
