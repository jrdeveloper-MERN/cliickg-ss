import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PolicyType } from '@prisma/client';
import { generateObjectId } from '../../common/utils/object-id.util';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { sanitizePolicyHtml, getSlugForPolicyType, getTitleForPolicyType } from './utils/policy-sanitizer.util';

@Injectable()
export class PoliciesService implements OnModuleInit {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultPolicies();
  }

  /**
   * Initializes default published policy documents if none exist in the database.
   */
  async seedDefaultPolicies() {
    const defaultTypes: PolicyType[] = [
      PolicyType.ABOUT,
      PolicyType.DELIVERY,
      PolicyType.PRIVACY,
      PolicyType.TERMS,
      PolicyType.RETURN_REFUND,
    ];

    for (const type of defaultTypes) {
      try {
        const existing = await this.prisma.policy.findUnique({ where: { type } });
        if (!existing) {
          const title = getTitleForPolicyType(type);
          const slug = getSlugForPolicyType(type);
          const defaultText = `Welcome to CLIICKG. This is the official ${title}. Detailed operational guidelines, terms, and specifications will be displayed here.`;
          const defaultJson = {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: defaultText }],
              },
            ],
          };
          const defaultHtml = `<p>${defaultText}</p>`;

          await this.prisma.policy.create({
            data: {
              id: generateObjectId(),
              type,
              title,
              slug,
              contentJson: defaultJson,
              contentHtml: defaultHtml,
              isPublished: true,
            },
          });
          this.logger.log(`Policy '${type}' initialized successfully.`);
        }
      } catch (err: any) {
        this.logger.warn(`Could not seed policy '${type}': ${err.message}`);
      }
    }
  }

  /**
   * Normalizes string/enum to valid PolicyType
   */
  normalizePolicyType(typeStr: string): PolicyType {
    if (!typeStr) throw new BadRequestException('Policy type parameter is required');
    const upper = typeStr.toUpperCase().replace(/-/g, '_');
    if (upper === 'ABOUT' || upper === 'ABOUT_US' || upper === 'ABOUT_US_POLICY') {
      return PolicyType.ABOUT;
    }
    if (upper === 'RETURN_AND_REFUND_POLICY' || upper === 'RETURN_REFUND' || upper === 'RETURN') {
      return PolicyType.RETURN_REFUND;
    }
    if (upper === 'DELIVERY' || upper === 'DELIVERY_POLICY' || upper === 'SHIPPING') {
      return PolicyType.DELIVERY;
    }
    if (upper === 'PRIVACY' || upper === 'PRIVACY_POLICY') {
      return PolicyType.PRIVACY;
    }
    if (upper === 'TERMS' || upper === 'TERMS_AND_CONDITIONS' || upper === 'TERMS_CONDITIONS') {
      return PolicyType.TERMS;
    }
    if (Object.values(PolicyType).includes(upper as PolicyType)) {
      return upper as PolicyType;
    }
    throw new BadRequestException(`Invalid policy type: '${typeStr}'. Allowed types: ${Object.values(PolicyType).join(', ')}`);
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Admin: Get all policies (including unpublished/drafts)
   */
  async findAllAdmin() {
    return this.prisma.policy.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Admin: Get single policy by type
   */
  async findByTypeAdmin(typeParam: string) {
    const type = this.normalizePolicyType(typeParam);
    const policy = await this.prisma.policy.findUnique({ where: { type } });
    if (!policy) {
      // If not yet created, return an empty template structure
      return {
        id: null,
        type,
        title: getTitleForPolicyType(type),
        slug: getSlugForPolicyType(type),
        contentJson: { type: 'doc', content: [] },
        contentHtml: '',
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return policy;
  }

  /**
   * Admin: Upsert policy (Create if absent, update if present)
   */
  async upsertPolicy(typeParam: string, dto: CreatePolicyDto | UpdatePolicyDto) {
    const type = dto.type ? this.normalizePolicyType(dto.type) : this.normalizePolicyType(typeParam);
    const existing = await this.prisma.policy.findUnique({ where: { type } });

    const title = dto.title || existing?.title || getTitleForPolicyType(type);
    const slug = dto.slug || existing?.slug || getSlugForPolicyType(type);
    const sanitizedHtml = dto.contentHtml !== undefined
      ? sanitizePolicyHtml(dto.contentHtml)
      : (existing?.contentHtml || '');
    const jsonContent = dto.contentJson !== undefined
      ? dto.contentJson
      : (existing?.contentJson || { type: 'doc', content: [] });
    const isPublished = dto.isPublished !== undefined
      ? Boolean(dto.isPublished)
      : (existing?.isPublished !== undefined ? existing.isPublished : true);

    return this.prisma.policy.upsert({
      where: { type },
      create: {
        id: generateObjectId(),
        type,
        title,
        slug,
        contentJson: jsonContent,
        contentHtml: sanitizedHtml,
        isPublished,
      },
      update: {
        title,
        slug,
        contentJson: jsonContent,
        contentHtml: sanitizedHtml,
        isPublished,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Admin: Toggle published/draft status of a policy
   */
  async togglePublishStatus(typeParam: string) {
    const type = this.normalizePolicyType(typeParam);
    const existing = await this.findByTypeAdmin(type);
    const newStatus = !existing.isPublished;

    return this.prisma.policy.upsert({
      where: { type },
      create: {
        id: generateObjectId(),
        type,
        title: existing.title || getTitleForPolicyType(type),
        slug: existing.slug || getSlugForPolicyType(type),
        contentJson: existing.contentJson || { type: 'doc', content: [] },
        contentHtml: existing.contentHtml || '',
        isPublished: newStatus,
      },
      update: {
        isPublished: newStatus,
        updatedAt: new Date(),
      },
    });
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Public: Get list of all published policies
   */
  async findAllPublished() {
    return this.prisma.policy.findMany({
      where: { isPublished: true },
      select: {
        type: true,
        title: true,
        slug: true,
        isPublished: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Public: Get published policy by type or slug
   */
  async findPublishedByTypeOrSlug(typeOrSlug: string) {
    if (!typeOrSlug || typeof typeOrSlug !== 'string') {
      throw new BadRequestException('Policy identifier is required');
    }

    const trimmed = typeOrSlug.trim();
    let normalizedType: PolicyType | null = null;
    try {
      normalizedType = this.normalizePolicyType(trimmed);
    } catch {
      normalizedType = null;
    }

    const policy = await this.prisma.policy.findFirst({
      where: {
        OR: [
          ...(normalizedType ? [{ type: normalizedType }] : []),
          { slug: { equals: trimmed, mode: 'insensitive' } },
          { slug: { equals: getSlugForPolicyType(trimmed), mode: 'insensitive' } },
        ],
        isPublished: true,
      },
      select: {
        type: true,
        title: true,
        slug: true,
        contentJson: true,
        contentHtml: true,
        isPublished: true,
        updatedAt: true,
      },
    });

    if (!policy) {
      throw new NotFoundException(`Published policy '${typeOrSlug}' not found.`);
    }

    return policy;
  }
}
