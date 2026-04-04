import { inject, injectable } from "inversify";
import { ORPCError } from "@orpc/server";
import sharp from "sharp";
import { type UserContext } from "@/lib/context.ts";
import { uploadFile, getSignedViewUrl } from "@/lib/storage.ts";
import { SalonRepository } from "@/domain/salons/salon-repository.ts";
import { SubmissionRepository } from "./submission-repository.ts";
import { SubmissionEntity } from "./submission-entity.ts";

@injectable()
export class SubmissionService {
  constructor(
    @inject(SubmissionRepository) private repo: SubmissionRepository,
    @inject(SalonRepository) private salonRepo: SalonRepository,
  ) {}

  async listMySubmissions(
    ctx: UserContext,
    memberId: string,
    salonId: string,
  ): Promise<SubmissionEntity[]> {
    ctx.logger.trace("Listing submissions", memberId, salonId);
    return this.repo.listByMemberAndSalon(ctx, memberId, salonId);
  }

  async listAllMySubmissions(
    ctx: UserContext,
    memberId: string,
  ): Promise<SubmissionEntity[]> {
    ctx.logger.trace("Listing all submissions for member", memberId);
    return this.repo.listByMember(ctx, memberId);
  }

  async submitDigital(
    ctx: UserContext,
    params: {
      salonId: string;
      categoryId: string;
      memberId: string;
      title: string;
      file: Buffer;
      filename: string;
      contentType: string;
    },
  ): Promise<SubmissionEntity> {
    ctx.logger.info("Submitting digital photo", params.categoryId, params.title);

    await this.validateSubmission(ctx, params.salonId, params.categoryId, params.memberId);

    // Process image metadata
    const metadata = await sharp(params.file).metadata();
    const widthPx = metadata.width ?? 0;
    const heightPx = metadata.height ?? 0;
    const fileSizeBytes = params.file.length;

    // Upload to S3
    const storageKey = `submissions/${params.salonId}/${params.categoryId}/${crypto.randomUUID()}-${params.filename}`;
    await uploadFile(storageKey, params.file, params.contentType);
    ctx.logger.info("File uploaded to S3", storageKey);

    const entity = SubmissionEntity.create({
      salonCategoryId: params.categoryId,
      memberId: params.memberId,
      storageKey,
      originalFilename: params.filename,
      fileSizeBytes,
      widthPx,
      heightPx,
      title: params.title,
    });

    const saved = await this.repo.save(ctx, entity);
    ctx.logger.info("Digital submission created", saved.id);
    return saved;
  }

  async submitPrint(
    ctx: UserContext,
    params: {
      salonId: string;
      categoryId: string;
      memberId: string;
      title: string;
    },
  ): Promise<SubmissionEntity> {
    ctx.logger.info("Submitting print entry", params.categoryId, params.title);

    await this.validateSubmission(ctx, params.salonId, params.categoryId, params.memberId);

    const entity = SubmissionEntity.create({
      salonCategoryId: params.categoryId,
      memberId: params.memberId,
      title: params.title,
    });

    const saved = await this.repo.save(ctx, entity);
    ctx.logger.info("Print submission created", saved.id);
    return saved;
  }

  async withdraw(ctx: UserContext, submissionId: string, memberId: string): Promise<SubmissionEntity> {
    ctx.logger.info("Withdrawing submission", submissionId);

    const existing = await this.repo.findById(ctx, submissionId);
    if (!existing) throw new ORPCError("NOT_FOUND", { message: "Submission not found." });
    if (existing.memberId !== memberId) throw new ORPCError("FORBIDDEN", { message: "Not your submission." });
    if (existing.isWithdrawn) throw new ORPCError("BAD_REQUEST", { message: "Already withdrawn." });

    const updated = await this.repo.save(ctx, existing.with({ status: "withdrawn" }));
    ctx.logger.info("Submission withdrawn", submissionId);
    return updated;
  }

  async getSalonSubmissionSummary(
    ctx: UserContext,
    salonId: string,
  ): Promise<Array<{ memberId: string; categoryId: string; count: number }>> {
    ctx.logger.trace("Getting salon submission summary", salonId);
    const salon = await this.salonRepo.findById(ctx, salonId);
    if (!salon) throw new ORPCError("NOT_FOUND", { message: "Salon not found." });

    const results: Array<{ memberId: string; categoryId: string; count: number }> = [];
    for (const category of salon.categories) {
      const submissions = await this.repo.listByCategory(ctx, category.id);
      const activeByMember = new Map<string, number>();
      for (const sub of submissions) {
        if (sub.status === "withdrawn") continue;
        activeByMember.set(sub.memberId, (activeByMember.get(sub.memberId) ?? 0) + 1);
      }
      for (const [memberId, count] of activeByMember) {
        results.push({ memberId, categoryId: category.id, count });
      }
    }
    return results;
  }

  async getSignedUrl(ctx: UserContext, submissionId: string): Promise<string | null> {
    const sub = await this.repo.findById(ctx, submissionId);
    if (!sub || !sub.storageKey) return null;
    return getSignedViewUrl(sub.storageKey);
  }

  // ── Validation ─────────────────────────────────────────────────────────

  private async validateSubmission(
    ctx: UserContext,
    salonId: string,
    categoryId: string,
    memberId: string,
  ): Promise<void> {
    const salon = await this.salonRepo.findById(ctx, salonId);
    if (!salon) throw new ORPCError("NOT_FOUND", { message: "Salon not found." });
    if (salon.status !== "open") {
      throw new ORPCError("BAD_REQUEST", { message: "Salon is not open for submissions." });
    }

    const category = salon.categories.find((c) => c.id === categoryId);
    if (!category) throw new ORPCError("NOT_FOUND", { message: "Category not found." });

    // Per-category limit: use category override or fall back to salon default
    const maxPerCategory = category.maxSubmissionsPerMember ?? salon.maxSubmissionsPerMember;
    const categoryCount = await this.repo.countByMemberAndCategory(ctx, memberId, categoryId);
    if (categoryCount >= maxPerCategory) {
      throw new ORPCError("BAD_REQUEST", {
        message: `You have reached the maximum of ${maxPerCategory} submissions for this category.`,
      });
    }
  }
}
