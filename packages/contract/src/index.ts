export { contract, type Inputs, type Outputs } from "./routes/index.ts";
export { type CurrentUserDto } from "./routes/auth-routes.ts";
export { type MemberDto } from "./routes/member-routes.ts";
export { type SalonTemplateDto, type TemplateCriterionDto, type TemplateSlotDto } from "./routes/salon-template-routes.ts";
export { type SalonDto, type SalonCriterionDto, type SalonCategoryDto } from "./routes/salon-routes.ts";
export { type SubmissionDto, type SalonSubmissionSummaryDto } from "./routes/submission-routes.ts";
export { type OnboardingConfigDto } from "./routes/onboarding-routes.ts";
export { type JudgingSubmissionDto, type ScoreDto } from "./routes/judging-routes.ts";
