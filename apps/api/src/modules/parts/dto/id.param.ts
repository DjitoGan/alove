import { IsString, Length } from "class-validator";

export class IdParam {
  @IsString()
  @Length(10, 50) // simple check (cuid), ajuste si besoin
  id!: string;
}
