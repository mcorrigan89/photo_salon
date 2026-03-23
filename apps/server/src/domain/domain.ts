import { inject, injectable } from "inversify";
import { EmailService } from "./email/email-service.ts";
import { MemberService } from "./members/member-service.ts";
import { SalonTemplateService } from "./salon-templates/salon-template-service.ts";
import { UserService } from "./users/user-service.ts";

@injectable()
export class AppDomain {
  constructor(
    @inject(UserService) public userService: UserService,
    @inject(EmailService) public emailService: EmailService,
    @inject(MemberService) public memberService: MemberService,
    @inject(SalonTemplateService) public salonTemplateService: SalonTemplateService,
  ) {}
}
