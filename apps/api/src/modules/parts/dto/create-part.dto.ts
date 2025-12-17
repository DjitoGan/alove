/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                        CREATE PART DTO — Validation pour création de pièce                         ║
 * ║  Implémente US-CAT-301: titre, état, prix, stock, images, refs OEM, ≥1 motorisation compatible    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  IsEnum,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * État de la pièce
 */
export enum PartConditionDto {
  NEW = 'NEW',
  USED_LIKE_NEW = 'USED_LIKE_NEW',
  USED_GOOD = 'USED_GOOD',
  USED_FAIR = 'USED_FAIR',
  REFURBISHED = 'REFURBISHED',
}

/**
 * Statut de publication
 */
export enum PartStatusDto {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

/**
 * [1] CreatePartDto
 *     Validation stricte pour création d'une pièce
 *     Règles métier:
 *     - Titre obligatoire (3-200 caractères)
 *     - Prix > 0
 *     - Stock >= 0
 *     - Au moins 1 référence OEM
 *     - Au moins 1 motorisation compatible (engineIds)
 */
export class CreatePartDto {
  @ApiProperty({
    description: 'Titre de la pièce',
    example: 'Filtre à huile Bosch 0986AF0250',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le titre est obligatoire' })
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  title: string;

  @ApiPropertyOptional({
    description: 'Description détaillée',
    example: 'Filtre à huile compatible Toyota, Honda. État neuf, jamais utilisé.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Prix en XOF (Franc CFA)',
    example: 15000,
    minimum: 1,
  })
  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  @IsPositive({ message: 'Le prix doit être supérieur à 0' })
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({
    description: 'Devise (défaut: XOF)',
    example: 'XOF',
    default: 'XOF',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'La devise doit être un code ISO 4217 (ex: XOF, EUR)' })
  currency?: string;

  @ApiProperty({
    description: 'Quantité en stock',
    example: 10,
    minimum: 0,
  })
  @IsInt({ message: 'Le stock doit être un entier' })
  @Min(0, { message: 'Le stock ne peut pas être négatif' })
  @Type(() => Number)
  stock: number;

  @ApiProperty({
    description: 'État de la pièce',
    enum: PartConditionDto,
    example: PartConditionDto.USED_GOOD,
  })
  @IsEnum(PartConditionDto, { message: 'État invalide' })
  condition: PartConditionDto;

  @ApiPropertyOptional({
    description: 'Statut de publication (défaut: DRAFT)',
    enum: PartStatusDto,
    default: PartStatusDto.DRAFT,
  })
  @IsOptional()
  @IsEnum(PartStatusDto, { message: 'Statut invalide' })
  status?: PartStatusDto;

  @ApiProperty({
    description: 'Références OEM (au moins 1 obligatoire)',
    example: ['0986AF0250', '15400-PLM-A01'],
    minItems: 1,
  })
  @IsArray({ message: 'Les références OEM doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Au moins 1 référence OEM est obligatoire' })
  @IsString({ each: true, message: 'Chaque référence OEM doit être une chaîne' })
  oemRefs: string[];

  @ApiProperty({
    description: 'IDs des motorisations compatibles (au moins 1 obligatoire)',
    example: ['clxyz123...', 'clxyz456...'],
    minItems: 1,
  })
  @IsArray({ message: 'Les motorisations doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Au moins 1 motorisation compatible est obligatoire' })
  @IsString({ each: true, message: 'Chaque ID de motorisation doit être une chaîne' })
  engineIds: string[];

  @ApiPropertyOptional({
    description: 'Ville de localisation',
    example: 'Lomé',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Code pays ISO 3166-1 alpha-2 (défaut: TG)',
    example: 'TG',
    default: 'TG',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'Le code pays doit être au format ISO 3166-1 alpha-2 (ex: TG, BJ)',
  })
  country?: string;

  @ApiProperty({
    description: 'ID du vendeur',
    example: 'clxyz789...',
  })
  @IsString()
  @IsNotEmpty({ message: "L'ID du vendeur est obligatoire" })
  vendorId: string;
}
