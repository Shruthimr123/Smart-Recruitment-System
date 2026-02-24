import { IsEmail } from "class-validator";

export class CurrentUserStatus{
 @IsEmail()
  email: string;
}