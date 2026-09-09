import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateObjectId } from '../../common/utils/object-id.util';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { CreateFeaturedSectionDto } from './dto/create-featured-section.dto';
import { UpdateFeaturedSectionDto } from './dto/update-featured-section.dto';
import { CreateScrollHeadingDto } from './dto/create-scroll-heading.dto';
import { UpdateScrollHeadingDto } from './dto/update-scroll-heading.dto';
import { CreateTodaysDealDto } from './dto/create-todays-deal.dto';
import { UpdateTodaysDealDto } from './dto/update-todays-deal.dto';
import { CreateTodaysDealBannerDto } from './dto/create-todays-deal-banner.dto';
import { UpdateTodaysDealBannerDto } from './dto/update-todays-deal-banner.dto';

function sanitizeImg(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (
    trimmed === '/uploads/undefined' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed.includes('undefined') ||
    trimmed.startsWith('__FILE_')
  ) {
    return '';
  }
  return trimmed;
}

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(private readonly prisma: PrismaService) { }

  // 1. Banners
  async getBanners() {
    return this.prisma.banner.findMany({
      orderBy: { position: 'asc' },
    });
  }

  async createBanner(dto: CreateBannerDto) {
    return this.prisma.banner.create({
      data: {
        id: generateObjectId(),
        title: dto.title,
        image: dto.image || '',
        link: dto.link || '',
        position: Number(dto.position || 0),
        status: dto.status || 'Active',
      },
    });
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Banner with ID '${id}' not found`);

    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.image !== undefined && { image: dto.image }),
        ...(dto.link !== undefined && { link: dto.link }),
        ...(dto.position !== undefined && { position: Number(dto.position) }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async toggleBannerStatus(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Banner with ID '${id}' not found`);

    const newStatus = banner.status === 'Active' ? 'Inactive' : 'Active';
    return this.prisma.banner.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async deleteBanner(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Banner with ID '${id}' not found`);

    await this.prisma.banner.delete({ where: { id } });
    return { message: `Banner '${banner.title}' deleted successfully`, id };
  }

  // 2. Certificates
  async getCertificates() {
    const certs = await this.prisma.certificate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return certs.map((c) => ({
      ...c,
      _id: c.id,
    }));
  }

  async createCertificate(dto: CreateCertificateDto) {
    const cert = await this.prisma.certificate.create({
      data: {
        id: generateObjectId(),
        title: dto.title || 'Certificate',
        image: dto.image || '',
        description: dto.description || '',
        status: dto.status || 'Active',
      },
    });
    return {
      ...cert,
      _id: cert.id,
    };
  }

  async updateCertificate(id: string, dto: UpdateCertificateDto) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException(`Certificate with ID '${id}' not found`);

    const updated = await this.prisma.certificate.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.image !== undefined && { image: dto.image }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
      },
    });

    return {
      ...updated,
      _id: updated.id,
    };
  }

  async toggleCertificateStatus(id: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException(`Certificate with ID '${id}' not found`);

    const newStatus = cert.status === 'Active' ? 'Inactive' : 'Active';
    const updated = await this.prisma.certificate.update({
      where: { id },
      data: { status: newStatus },
    });

    return {
      ...updated,
      _id: updated.id,
    };
  }

  async deleteCertificate(id: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException(`Certificate with ID '${id}' not found`);

    await this.prisma.certificate.delete({ where: { id } });
    return { message: `Certificate '${cert.title}' deleted successfully`, id };
  }

  // 3. Contact Page
  async getContact() {
    let contact = await this.prisma.contactPage.findFirst();
    if (!contact) {
      contact = await this.prisma.contactPage.create({
        data: {
          id: generateObjectId(),
          pageTitle: 'Contact Us',
          heading: 'Get In Touch',
          description: '',
          storeName: '',
          phone: '',
          secondaryPhone: '',
          email: '',
          secondaryEmail: '',
          address: '',
          mapUrl: '',
          googleMapEmbed: '',
          workingHours: '',
          businessHours: '',
          facebook: '',
          instagram: '',
          whatsapp: '',
          youtube: '',
          twitter: '',
          linkedin: '',
          pinterest: '',
          seoTitle: '',
          seoDescription: '',
          seoKeywords: '',
          branches: [],
        },
      });
    }

    const mainBranch = Array.isArray(contact.branches) && (contact.branches as any[]).length > 0
      ? (contact.branches as any[])[0]
      : null;

    const result: any = {
      ...contact,
      _id: contact.id,
      pageTitle: contact.pageTitle || 'Contact Us',
      heading: contact.heading || 'Get In Touch',
      description: contact.description || '',
      phone: contact.phone || mainBranch?.phone || '',
      email: contact.email || mainBranch?.email || '',
      address: contact.address || mainBranch?.address || '',
      mapUrl: contact.googleMapEmbed || contact.mapUrl || mainBranch?.googleMapEmbed || '',
      storeName: contact.storeName || mainBranch?.storeName || '',
      secondaryPhone: contact.secondaryPhone || mainBranch?.secondaryPhone || '',
      secondaryEmail: contact.secondaryEmail || mainBranch?.secondaryEmail || '',
      googleMapEmbed: contact.googleMapEmbed || contact.mapUrl || mainBranch?.googleMapEmbed || '',
      businessHours: contact.businessHours || contact.workingHours || mainBranch?.businessHours || '',
      branches: contact.branches || [
        {
          name: 'Main Branch',
          storeName: contact.storeName || '',
          address: contact.address || '',
          phone: contact.phone || '',
          secondaryPhone: contact.secondaryPhone || '',
          email: contact.email || '',
          secondaryEmail: contact.secondaryEmail || '',
          googleMapEmbed: contact.googleMapEmbed || contact.mapUrl || '',
          businessHours: contact.businessHours || contact.workingHours || '',
          displayOrder: 0,
          status: 'Active'
        }
      ]
    };
    delete result.workingHours;
    return result;
  }

  async updateContact(dto: UpdateContactDto) {
    const existing = await this.getContact();
    const mainBranch = Array.isArray(dto.branches) && dto.branches.length > 0 ? dto.branches[0] : null;

    const phoneVal = dto.phone || mainBranch?.phone || existing.phone;
    const emailVal = dto.email || mainBranch?.email || existing.email;
    const addressVal = dto.address || mainBranch?.address || existing.address;
    const storeNameVal = dto.storeName || mainBranch?.storeName || existing.storeName;
    const secPhoneVal = dto.secondaryPhone || mainBranch?.secondaryPhone || existing.secondaryPhone;
    const secEmailVal = dto.secondaryEmail || mainBranch?.secondaryEmail || existing.secondaryEmail;
    const gMapVal = dto.googleMapEmbed || dto.mapUrl || mainBranch?.googleMapEmbed || existing.googleMapEmbed;
    const bHoursVal = dto.businessHours || dto.workingHours || mainBranch?.businessHours || existing.businessHours;

    const updated = await this.prisma.contactPage.update({
      where: { id: existing.id },
      data: {
        ...(dto.pageTitle !== undefined && { pageTitle: dto.pageTitle }),
        ...(dto.heading !== undefined && { heading: dto.heading }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(storeNameVal !== undefined && { storeName: storeNameVal }),
        ...(phoneVal !== undefined && { phone: phoneVal }),
        ...(secPhoneVal !== undefined && { secondaryPhone: secPhoneVal }),
        ...(emailVal !== undefined && { email: emailVal }),
        ...(secEmailVal !== undefined && { secondaryEmail: secEmailVal }),
        ...(addressVal !== undefined && { address: addressVal }),
        ...(gMapVal !== undefined && { mapUrl: gMapVal, googleMapEmbed: gMapVal }),
        ...(bHoursVal !== undefined && { workingHours: bHoursVal, businessHours: bHoursVal }),
        ...(dto.facebook !== undefined && { facebook: dto.facebook }),
        ...(dto.instagram !== undefined && { instagram: dto.instagram }),
        ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp }),
        ...(dto.youtube !== undefined && { youtube: dto.youtube }),
        ...(dto.twitter !== undefined && { twitter: dto.twitter }),
        ...(dto.linkedin !== undefined && { linkedin: dto.linkedin }),
        ...(dto.pinterest !== undefined && { pinterest: dto.pinterest }),
        ...(dto.seoTitle !== undefined && { seoTitle: dto.seoTitle }),
        ...(dto.seoDescription !== undefined && { seoDescription: dto.seoDescription }),
        ...(dto.seoKeywords !== undefined && { seoKeywords: dto.seoKeywords }),
        ...(dto.branches !== undefined && { branches: dto.branches }),
      },
    });

    const resObj: any = { ...updated, _id: updated.id };
    delete resObj.workingHours;
    return resObj;
  }

  // 4. FAQs
  async getFaqs() {
    return this.prisma.fAQ.findMany({
      orderBy: { position: 'asc' },
    });
  }

  async createFaq(dto: CreateFaqDto) {
    return this.prisma.fAQ.create({
      data: {
        id: generateObjectId(),
        question: dto.question,
        answer: dto.answer,
        category: dto.category || 'General',
        position: Number(dto.position || 0),
        status: dto.status || 'Active',
      },
    });
  }

  async updateFaq(id: string, dto: UpdateFaqDto) {
    const faq = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException(`FAQ with ID '${id}' not found`);

    return this.prisma.fAQ.update({
      where: { id },
      data: {
        ...(dto.question && { question: dto.question }),
        ...(dto.answer && { answer: dto.answer }),
        ...(dto.category && { category: dto.category }),
        ...(dto.position !== undefined && { position: Number(dto.position) }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async deleteFaq(id: string) {
    const faq = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException(`FAQ with ID '${id}' not found`);

    await this.prisma.fAQ.delete({ where: { id } });
    return { message: `FAQ deleted successfully`, id };
  }

  // 5. Featured Sections
  async getFeaturedSections() {
    const items = await this.prisma.featuredSection.findMany({
      orderBy: { position: 'asc' },
    });
    return items.map(item => ({
      ...item,
      _id: item.id,
      priority: item.position,
      selectType: item.selectType || item.type,
      shortDesc: item.shortDescription || '',
      seoDesc: item.seoKeywordDescription || '',
    }));
  }

  async createFeaturedSection(dto: CreateFeaturedSectionDto) {
    const sectionId = generateObjectId();
    const pos = Number(dto.position ?? dto.priority ?? 0);
    return this.prisma.featuredSection.create({
      data: {
        id: sectionId,
        title: dto.title,
        shortDescription: dto.shortDescription || '',
        seoKeywordDescription: dto.seoKeywordDescription || '',
        type: dto.type || dto.selectType || 'Grid',
        selectType: dto.selectType || dto.type || 'Grid',
        gridType: dto.gridType || 'Grid 4',
        carouselType: dto.carouselType || 'non_carousel',
        mediaType: dto.mediaType || 'image',
        productStyle: dto.productStyle || 'Grid 4',
        productIds: dto.productIds || [],
        items: dto.items ? dto.items : [],
        position: isNaN(pos) ? 0 : pos,
        status: dto.status || 'Active',
      },
    });
  }

  async updateFeaturedSection(id: string, dto: UpdateFeaturedSectionDto) {
    const existing = await this.prisma.featuredSection.findUnique({ where: { id } });

    const posRaw = dto.position ?? dto.priority ?? existing?.position;
    const pos = posRaw !== undefined ? Number(posRaw) : undefined;

    if (!existing) {
      // Upsert fallback if ID does not exist in DB
      return this.prisma.featuredSection.create({
        data: {
          id: id || generateObjectId(),
          title: dto.title || 'Featured Section',
          shortDescription: dto.shortDescription || '',
          seoKeywordDescription: dto.seoKeywordDescription || '',
          type: dto.type || dto.selectType || 'Grid',
          selectType: dto.selectType || dto.type || 'Grid',
          gridType: dto.gridType || 'Grid 4',
          carouselType: dto.carouselType || 'non_carousel',
          mediaType: dto.mediaType || 'image',
          productStyle: dto.productStyle || 'Grid 4',
          productIds: dto.productIds || [],
          items: dto.items ? dto.items : [],
          position: pos !== undefined && !isNaN(pos) ? pos : 0,
          status: dto.status || 'Active',
        },
      });
    }

    return this.prisma.featuredSection.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.seoKeywordDescription !== undefined && { seoKeywordDescription: dto.seoKeywordDescription }),
        ...((dto.type || dto.selectType) && { type: dto.type || dto.selectType, selectType: dto.selectType || dto.type }),
        ...(dto.gridType !== undefined && { gridType: dto.gridType }),
        ...(dto.carouselType !== undefined && { carouselType: dto.carouselType }),
        ...(dto.mediaType !== undefined && { mediaType: dto.mediaType }),
        ...(dto.productStyle !== undefined && { productStyle: dto.productStyle }),
        ...(dto.productIds !== undefined && { productIds: dto.productIds }),
        ...(dto.items !== undefined && { items: dto.items }),
        ...(pos !== undefined && !isNaN(pos) && { position: pos }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async deleteFeaturedSection(id: string) {
    const section = await this.prisma.featuredSection.findUnique({ where: { id } });
    if (!section) {
      return { message: 'Featured section deleted successfully', id };
    }

    await this.prisma.featuredSection.delete({ where: { id } });
    return { message: `Featured section '${section.title}' deleted successfully`, id };
  }

  // 6. Scroll Headings
  async getScrollHeadings() {
    const items = await this.prisma.scrollHeading.findMany({
      orderBy: { position: 'asc' },
    });
    return items.map(item => ({
      ...item,
      _id: item.id,
    }));
  }

  async createScrollHeading(dto: any) {
    return this.prisma.scrollHeading.create({
      data: {
        id: generateObjectId(),
        text: dto.text || '',
        title: dto.title || '',
        link: dto.link || '',
        position: Number(dto.position || 0),
        status: dto.status || 'Active',
        backgroundColor: dto.backgroundColor || '#d98896',
        color: dto.color || '#ffffff',
        fontFamily: dto.fontFamily || 'Outfit',
        fontSize: dto.fontSize || '14px',
        fontStyle: dto.fontStyle || 'normal',
        fontWeight: dto.fontWeight || '700',
        letterSpacing: dto.letterSpacing || 'normal',
        speed: dto.speed ? Number(dto.speed) : 6,
      },
    });
  }

  async updateScrollHeading(id: string, dto: any) {
    const existing = await this.prisma.scrollHeading.findUnique({ where: { id } });
    if (!existing) {
      return this.prisma.scrollHeading.create({
        data: {
          id: id || generateObjectId(),
          text: dto.text || '',
          title: dto.title || '',
          link: dto.link || '',
          position: Number(dto.position || 0),
          status: dto.status || 'Active',
          backgroundColor: dto.backgroundColor || '#d98896',
          color: dto.color || '#ffffff',
          fontFamily: dto.fontFamily || 'Outfit',
          fontSize: dto.fontSize || '14px',
          fontStyle: dto.fontStyle || 'normal',
          fontWeight: dto.fontWeight || '700',
          letterSpacing: dto.letterSpacing || 'normal',
          speed: dto.speed ? Number(dto.speed) : 6,
        },
      });
    }

    return this.prisma.scrollHeading.update({
      where: { id },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.link !== undefined && { link: dto.link }),
        ...(dto.position !== undefined && { position: Number(dto.position) }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.backgroundColor !== undefined && { backgroundColor: dto.backgroundColor }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.fontFamily !== undefined && { fontFamily: dto.fontFamily }),
        ...(dto.fontSize !== undefined && { fontSize: dto.fontSize }),
        ...(dto.fontStyle !== undefined && { fontStyle: dto.fontStyle }),
        ...(dto.fontWeight !== undefined && { fontWeight: dto.fontWeight }),
        ...(dto.letterSpacing !== undefined && { letterSpacing: dto.letterSpacing }),
        ...(dto.speed !== undefined && { speed: Number(dto.speed) }),
      },
    });
  }

  async toggleScrollHeadingStatus(id: string) {
    const heading = await this.prisma.scrollHeading.findUnique({ where: { id } });
    if (!heading) throw new NotFoundException(`Scroll Heading with ID '${id}' not found`);

    const newStatus = heading.status === 'Active' ? 'Inactive' : 'Active';
    return this.prisma.scrollHeading.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async deleteScrollHeading(id: string) {
    const heading = await this.prisma.scrollHeading.findUnique({ where: { id } });
    if (!heading) return { message: 'Scroll heading deleted successfully', id };

    await this.prisma.scrollHeading.delete({ where: { id } });
    return { message: `Scroll heading deleted successfully`, id };
  }

  // 7. Today's Deals
  async getTodaysDeals() {
    const items = await this.prisma.todaysDeal.findMany({
      orderBy: { position: 'asc' },
    });
    return items.map(item => ({
      ...item,
      _id: item.id,
      priority: item.position,
      selectType: item.selectType || item.type,
      shortDesc: item.shortDescription || '',
      seoDesc: item.seoKeywordDescription || '',
    }));
  }

  async createTodaysDeal(dto: CreateTodaysDealDto) {
    const dealId = generateObjectId();
    const pos = Number(dto.position ?? dto.priority ?? 0);
    return this.prisma.todaysDeal.create({
      data: {
        id: dealId,
        title: dto.title,
        shortDescription: dto.shortDescription || '',
        seoKeywordDescription: dto.seoKeywordDescription || '',
        type: dto.type || dto.selectType || 'main_category',
        selectType: dto.selectType || dto.type || 'main_category',
        gridType: dto.gridType || 'Grid 4',
        carouselType: dto.carouselType || 'non_carousel',
        mediaType: dto.mediaType || 'image',
        productStyle: dto.productStyle || 'Grid 4',
        productIds: dto.productIds || [],
        items: dto.items ? dto.items : [],
        position: isNaN(pos) ? 0 : pos,
        discountText: dto.discountText || '',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status || 'Active',
      },
    });
  }

  async updateTodaysDeal(id: string, dto: UpdateTodaysDealDto) {
    const existing = await this.prisma.todaysDeal.findUnique({ where: { id } });
    const posRaw = dto.position ?? dto.priority ?? existing?.position;
    const pos = posRaw !== undefined ? Number(posRaw) : undefined;

    if (!existing) {
      // Upsert fallback if ID does not exist in DB
      return this.prisma.todaysDeal.create({
        data: {
          id: id || generateObjectId(),
          title: dto.title || "Today's Deal",
          shortDescription: dto.shortDescription || '',
          seoKeywordDescription: dto.seoKeywordDescription || '',
          type: dto.type || dto.selectType || 'main_category',
          selectType: dto.selectType || dto.type || 'main_category',
          gridType: dto.gridType || 'Grid 4',
          carouselType: dto.carouselType || 'non_carousel',
          mediaType: dto.mediaType || 'image',
          productStyle: dto.productStyle || 'Grid 4',
          productIds: dto.productIds || [],
          items: dto.items ? dto.items : [],
          position: pos !== undefined && !isNaN(pos) ? pos : 0,
          discountText: dto.discountText || '',
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          status: dto.status || 'Active',
        },
      });
    }

    return this.prisma.todaysDeal.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.seoKeywordDescription !== undefined && { seoKeywordDescription: dto.seoKeywordDescription }),
        ...((dto.type || dto.selectType) && { type: dto.type || dto.selectType, selectType: dto.selectType || dto.type }),
        ...(dto.gridType !== undefined && { gridType: dto.gridType }),
        ...(dto.carouselType !== undefined && { carouselType: dto.carouselType }),
        ...(dto.mediaType !== undefined && { mediaType: dto.mediaType }),
        ...(dto.productStyle !== undefined && { productStyle: dto.productStyle }),
        ...(dto.productIds !== undefined && { productIds: dto.productIds }),
        ...(dto.items !== undefined && { items: dto.items }),
        ...(pos !== undefined && !isNaN(pos) && { position: pos }),
        ...(dto.discountText !== undefined && { discountText: dto.discountText }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async deleteTodaysDeal(id: string) {
    const deal = await this.prisma.todaysDeal.findUnique({ where: { id } });
    if (!deal) {
      return { message: "Today's Deal deleted successfully", id };
    }

    await this.prisma.todaysDeal.delete({ where: { id } });
    return { message: `Today's Deal '${deal.title}' deleted successfully`, id };
  }

  // 8. Today's Deal Banners
  async getTodaysDealBanners() {
    const items = await this.prisma.todaysDealBanner.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return items.map(item => ({
      ...item,
      _id: item.id,
      image: sanitizeImg(item.image),
    }));
  }

  async createTodaysDealBanner(dto: CreateTodaysDealBannerDto, imageFileUrl?: string) {
    const finalImage = sanitizeImg(imageFileUrl) || sanitizeImg(dto.image);
    return this.prisma.todaysDealBanner.create({
      data: {
        id: generateObjectId(),
        title: dto.title || '',
        image: finalImage,
        link: dto.link || dto.linkUrl || '',
        linkType: dto.linkType || '',
        linkId: dto.linkId || '',
        linkUrl: dto.linkUrl || dto.link || '',
        status: dto.status || 'Active',
      },
    });
  }

  async updateTodaysDealBanner(id: string, dto: UpdateTodaysDealBannerDto, imageFileUrl?: string) {
    const existing = await this.prisma.todaysDealBanner.findUnique({ where: { id } });
    const newImage = sanitizeImg(imageFileUrl) || sanitizeImg(dto.image);

    if (!existing) {
      return this.prisma.todaysDealBanner.create({
        data: {
          id: id || generateObjectId(),
          title: dto.title || '',
          image: newImage,
          link: dto.link || dto.linkUrl || '',
          linkType: dto.linkType || '',
          linkId: dto.linkId || '',
          linkUrl: dto.linkUrl || dto.link || '',
          status: dto.status || 'Active',
        },
      });
    }

    return this.prisma.todaysDealBanner.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(newImage !== undefined && newImage !== '' && { image: newImage }),
        ...((dto.link !== undefined || dto.linkUrl !== undefined) && { link: dto.link || dto.linkUrl || '' }),
        ...(dto.linkType !== undefined && { linkType: dto.linkType }),
        ...(dto.linkId !== undefined && { linkId: dto.linkId }),
        ...(dto.linkUrl !== undefined && { linkUrl: dto.linkUrl }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async toggleTodaysDealBannerStatus(id: string) {
    const banner = await this.prisma.todaysDealBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Today's Deal Banner with ID '${id}' not found`);

    const newStatus = banner.status === 'Active' ? 'Inactive' : 'Active';
    return this.prisma.todaysDealBanner.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async deleteTodaysDealBanner(id: string) {
    const banner = await this.prisma.todaysDealBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Today's Deal Banner with ID '${id}' not found`);

    await this.prisma.todaysDealBanner.delete({ where: { id } });
    return { message: `Today's Deal Banner '${banner.title}' deleted successfully`, id };
  }

  // 9. Store Promises
  async getStorePromises() {
    const promises = await this.prisma.storePromise.findMany({
      where: {
        id: { not: 'PROMISES_SECTION_BANNER' },
      },
      orderBy: { position: 'asc' },
    });

    return promises.map((p) => ({
      ...p,
      _id: p.id,
      title: p.title,
      description: p.description,
      order: p.position,
      icon: p.icon,
      status: p.status,
    }));
  }

  async getStorePromiseBanner() {
    const bannerRecord = await this.prisma.storePromise.findUnique({
      where: { id: 'PROMISES_SECTION_BANNER' },
    });
    return { bannerUrl: bannerRecord?.icon || '' };
  }

  async updateStorePromiseBanner(iconUrl: string) {
    const updated = await this.prisma.storePromise.upsert({
      where: { id: 'PROMISES_SECTION_BANNER' },
      create: {
        id: 'PROMISES_SECTION_BANNER',
        title: 'Store Promises Section Banner',
        icon: iconUrl,
        position: 9999,
        status: 'Active',
      },
      update: {
        icon: iconUrl,
        status: 'Active',
      },
    });
    return { bannerUrl: updated.icon };
  }

  async deleteStorePromiseBanner() {
    try {
      await this.prisma.storePromise.delete({
        where: { id: 'PROMISES_SECTION_BANNER' },
      });
    } catch (e) {
      // Record might not exist
    }
    return { bannerUrl: '' };
  }

  async createStorePromise(payload: any) {
    const created = await this.prisma.storePromise.create({
      data: {
        id: generateObjectId(),
        title: payload.title || 'Store Promise',
        description: payload.description || '',
        icon: payload.icon || '',
        position: Number(payload.order || payload.position || 0),
        status: payload.status || 'Active',
      },
    });

    return {
      ...created,
      _id: created.id,
      order: created.position,
    };
  }

  async updateStorePromise(id: string, payload: any) {
    const existing = await this.prisma.storePromise.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Store Promise '${id}' not found`);

    const updated = await this.prisma.storePromise.update({
      where: { id },
      data: {
        ...(payload.title && { title: payload.title }),
        ...(payload.description !== undefined && { description: payload.description }),
        ...(payload.icon !== undefined && { icon: payload.icon }),
        ...(payload.order !== undefined && { position: Number(payload.order) }),
        ...(payload.status && { status: payload.status }),
      },
    });

    return {
      ...updated,
      _id: updated.id,
      order: updated.position,
    };
  }

  async toggleStorePromiseStatus(id: string) {
    const existing = await this.prisma.storePromise.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Store Promise '${id}' not found`);

    const newStatus = existing.status === 'Active' ? 'Inactive' : 'Active';
    const updated = await this.prisma.storePromise.update({
      where: { id },
      data: { status: newStatus },
    });

    return {
      ...updated,
      _id: updated.id,
      order: updated.position,
    };
  }

  async deleteStorePromise(id: string) {
    const existing = await this.prisma.storePromise.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Store Promise '${id}' not found`);

    await this.prisma.storePromise.delete({ where: { id } });
    return { message: `Store Promise '${existing.title}' deleted successfully`, id };
  }
}
