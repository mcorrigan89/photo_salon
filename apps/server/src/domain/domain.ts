import { inject, injectable } from "inversify";
import { EmailService } from "./email/email-service.ts";
import { UserService } from "./users/user-service.ts";

@injectable()
export class AppDomain {
  constructor(
    @inject(UserService) public userService: UserService,
    @inject(EmailService) public emailService: EmailService
  ) {}
}
