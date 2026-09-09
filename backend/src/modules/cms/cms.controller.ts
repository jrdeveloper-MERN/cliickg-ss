import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body,
  UseInterceptors, UploadedFile, UseGuards, HttpCode, HttpStatus, BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CmsService } from './cms.service';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const uploadStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = join(process.cwd(), 'uploads');
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // 0. Image Upload API
  @ApiTags('CMS - Upload')
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload image file for rich text editor and CMS' })
  async uploadImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No image file uploaded');
    }
    return { imageUrl: `/uploads/${file.filename}` };
  }

  // 1. Hero Banners
  @ApiTags('CMS - Hero Banners')
  @Get('banners')
  @ApiOperation({ summary: 'Get all homepage hero banners' })
  async getBanners() {
    return this.cmsService.getBanners();
  }

  @ApiTags('CMS - Hero Banners')
  @Post('banners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new homepage hero banner' })
  async createBanner(@UploadedFile() file: any, @Body() dto: CreateBannerDto) {
    if (file) {
      dto.image = `/uploads/${file.filename}`;
    }
    return this.cmsService.createBanner(dto);
  }

  @ApiTags('CMS - Hero Banners')
  @Put('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @ApiOperation({ summary: 'Update homepage hero banner' })
  async updateBanner(@Param('id') id: string, @UploadedFile() file: any, @Body() dto: UpdateBannerDto) {
    if (file) {
      dto.image = `/uploads/${file.filename}`;
    }
    return this.cmsService.updateBanner(id, dto);
  }

  @ApiTags('CMS - Hero Banners')
  @Patch('banners/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle hero banner status (Active / Inactive)' })
  async toggleBannerStatus(@Param('id') id: string) {
    return this.cmsService.toggleBannerStatus(id);
  }

  @ApiTags('CMS - Hero Banners')
  @Delete('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete hero banner' })
  async deleteBanner(@Param('id') id: string) {
    return this.cmsService.deleteBanner(id);
  }

  // 2. Certificates
  @ApiTags('CMS - Certificates')
  @Get('certificates')
  @ApiOperation({ summary: 'Get all trust certificates and BIS hallmarks' })
  async getCertificates() {
    return this.cmsService.getCertificates();
  }

  @ApiTags('CMS - Certificates')
  @Post('certificates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create trust certificate' })
  async createCertificate(@UploadedFile() file: any, @Body() dto: CreateCertificateDto) {
    if (file) {
      dto.image = `/uploads/${file.filename}`;
    }
    return this.cmsService.createCertificate(dto);
  }

  @ApiTags('CMS - Certificates')
  @Put('certificates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @ApiOperation({ summary: 'Update trust certificate' })
  async updateCertificate(@Param('id') id: string, @UploadedFile() file: any, @Body() dto: UpdateCertificateDto) {
    if (file) {
      dto.image = `/uploads/${file.filename}`;
    }
    return this.cmsService.updateCertificate(id, dto);
  }

  @ApiTags('CMS - Certificates')
  @Patch('certificates/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle trust certificate status' })
  async toggleCertificateStatus(@Param('id') id: string) {
    return this.cmsService.toggleCertificateStatus(id);
  }

  @ApiTags('CMS - Certificates')
  @Delete('certificates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete trust certificate' })
  async deleteCertificate(@Param('id') id: string) {
    return this.cmsService.deleteCertificate(id);
  }

  // 3. Contact Page
  @ApiTags('CMS - Contact Us')
  @Get('contact')
  @ApiOperation({ summary: 'Get Contact Us page configuration, store details, and social links' })
  async getContact() {
    return this.cmsService.getContact();
  }

  @ApiTags('CMS - Contact Us')
  @Put('contact')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Contact Us page configuration, store details, and social links' })
  async updateContact(@Body() dto: UpdateContactDto) {
    return this.cmsService.updateContact(dto);
  }

  // 4. FAQs
  @ApiTags('CMS - FAQs')
  @Get('faqs')
  @ApiOperation({ summary: 'Get all frequently asked questions (FAQs)' })
  async getFaqs() {
    return this.cmsService.getFaqs();
  }

  @ApiTags('CMS - FAQs')
  @Post('faqs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create FAQ entry' })
  async createFaq(@Body() dto: CreateFaqDto) {
    return this.cmsService.createFaq(dto);
  }

  @ApiTags('CMS - FAQs')
  @Put('faqs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update FAQ entry' })
  async updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.cmsService.updateFaq(id, dto);
  }

  @ApiTags('CMS - FAQs')
  @Delete('faqs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete FAQ entry' })
  async deleteFaq(@Param('id') id: string) {
    return this.cmsService.deleteFaq(id);
  }

  // 5. Featured Sections
  @ApiTags('CMS - Featured Sections')
  @Get('featured-sections')
  @ApiOperation({ summary: 'Get all homepage featured sections' })
  async getFeaturedSections() {
    return this.cmsService.getFeaturedSections();
  }

  @ApiTags('CMS - Featured Sections')
  @Post('featured-sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new homepage featured section' })
  async createFeaturedSection(@Body() dto: CreateFeaturedSectionDto) {
    return this.cmsService.createFeaturedSection(dto);
  }

  @ApiTags('CMS - Featured Sections')
  @Put('featured-sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update homepage featured section' })
  async updateFeaturedSection(@Param('id') id: string, @Body() dto: UpdateFeaturedSectionDto) {
    return this.cmsService.updateFeaturedSection(id, dto);
  }

  @ApiTags('CMS - Featured Sections')
  @Delete('featured-sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete homepage featured section' })
  async deleteFeaturedSection(@Param('id') id: string) {
    return this.cmsService.deleteFeaturedSection(id);
  }

  // 6. Scroll Headings
  @ApiTags('CMS - Scroll Headings')
  @Get('scroll-headings')
  @ApiOperation({ summary: 'Get top marquee scroll announcements' })
  async getScrollHeadings() {
    return this.cmsService.getScrollHeadings();
  }

  @ApiTags('CMS - Scroll Headings')
  @Post('scroll-headings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create top marquee scroll announcement' })
  async createScrollHeading(@Body() dto: CreateScrollHeadingDto) {
    return this.cmsService.createScrollHeading(dto);
  }

  @ApiTags('CMS - Scroll Headings')
  @Put('scroll-headings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update top marquee scroll announcement' })
  async updateScrollHeading(@Param('id') id: string, @Body() dto: UpdateScrollHeadingDto) {
    return this.cmsService.updateScrollHeading(id, dto);
  }

  @ApiTags('CMS - Scroll Headings')
  @Patch('scroll-headings/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle marquee scroll announcement status' })
  async toggleScrollHeadingStatus(@Param('id') id: string) {
    return this.cmsService.toggleScrollHeadingStatus(id);
  }

  @ApiTags('CMS - Scroll Headings')
  @Delete('scroll-headings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete marquee scroll announcement' })
  async deleteScrollHeading(@Param('id') id: string) {
    return this.cmsService.deleteScrollHeading(id);
  }

  // 7. Today's Deals
  @ApiTags("CMS - Today's Deals")
  @Get('todays-deals')
  @ApiOperation({ summary: "Get all Today's Deals promotional sections" })
  async getTodaysDeals() {
    return this.cmsService.getTodaysDeals();
  }

  @ApiTags("CMS - Today's Deals")
  @Post('todays-deals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create new Today's Deals promotional section" })
  async createTodaysDeal(@Body() dto: CreateTodaysDealDto) {
    return this.cmsService.createTodaysDeal(dto);
  }

  @ApiTags("CMS - Today's Deals")
  @Put('todays-deals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Update Today's Deals promotional section" })
  async updateTodaysDeal(@Param('id') id: string, @Body() dto: UpdateTodaysDealDto) {
    return this.cmsService.updateTodaysDeal(id, dto);
  }

  @ApiTags("CMS - Today's Deals")
  @Delete('todays-deals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Delete Today's Deals promotional section" })
  async deleteTodaysDeal(@Param('id') id: string) {
    return this.cmsService.deleteTodaysDeal(id);
  }

  // 8. Today's Deal Banners
  @ApiTags("CMS - Today's Deals")
  @Get('todays-deals-banners')
  @ApiOperation({ summary: "Get all Today's Deal Banners" })
  async getTodaysDealBanners() {
    return this.cmsService.getTodaysDealBanners();
  }

  @ApiTags("CMS - Today's Deals")
  @Post('todays-deals-banners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create new Today's Deal Banner with image upload" })
  async createTodaysDealBanner(@UploadedFile() file: any, @Body() dto: CreateTodaysDealBannerDto) {
    const imageUrl = file && file.filename ? `/uploads/${file.filename}` : undefined;
    return this.cmsService.createTodaysDealBanner(dto, imageUrl);
  }

  @ApiTags("CMS - Today's Deals")
  @Put('todays-deals-banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @ApiOperation({ summary: "Update Today's Deal Banner" })
  async updateTodaysDealBanner(@Param('id') id: string, @UploadedFile() file: any, @Body() dto: UpdateTodaysDealBannerDto) {
    const imageUrl = file && file.filename ? `/uploads/${file.filename}` : undefined;
    return this.cmsService.updateTodaysDealBanner(id, dto, imageUrl);
  }

  @ApiTags("CMS - Today's Deals")
  @Patch('todays-deals-banners/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Toggle Today's Deal Banner status" })
  async toggleTodaysDealBannerStatus(@Param('id') id: string) {
    return this.cmsService.toggleTodaysDealBannerStatus(id);
  }

  @ApiTags("CMS - Today's Deals")
  @Delete('todays-deals-banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Delete Today's Deal Banner" })
  async deleteTodaysDealBanner(@Param('id') id: string) {
    return this.cmsService.deleteTodaysDealBanner(id);
  }

  // 9. Store Promises
  @ApiTags('CMS - Store Promises')
  @Get('store-promises/banner')
  @ApiOperation({ summary: 'Get store promises section banner image' })
  async getStorePromiseBanner() {
    return this.cmsService.getStorePromiseBanner();
  }

  @ApiTags('CMS - Store Promises')
  @Post('store-promises/banner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image', { storage: uploadStorage }))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload store promises section banner image' })
  async updateStorePromiseBanner(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No banner image file uploaded');
    }
    const bannerUrl = `/uploads/${file.filename}`;
    return this.cmsService.updateStorePromiseBanner(bannerUrl);
  }

  @ApiTags('CMS - Store Promises')
  @Delete('store-promises/banner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete store promises section banner image' })
  async deleteStorePromiseBanner() {
    return this.cmsService.deleteStorePromiseBanner();
  }

  @ApiTags('CMS - Store Promises')
  @Get('store-promises')
  @ApiOperation({ summary: 'Get all store trust badges & promise highlights' })
  async getStorePromises() {
    return this.cmsService.getStorePromises();
  }

  @ApiTags('CMS - Store Promises')
  @Post('store-promises')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('icon', { storage: uploadStorage }))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create store trust badge & promise highlight' })
  async createStorePromise(@UploadedFile() file: any, @Body() payload: any) {
    if (file) {
      payload.icon = `/uploads/${file.filename}`;
    }
    return this.cmsService.createStorePromise(payload);
  }

  @ApiTags('CMS - Store Promises')
  @Put('store-promises/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('icon', { storage: uploadStorage }))
  @ApiOperation({ summary: 'Update store trust badge' })
  async updateStorePromise(@Param('id') id: string, @UploadedFile() file: any, @Body() payload: any) {
    if (file) {
      payload.icon = `/uploads/${file.filename}`;
    }
    return this.cmsService.updateStorePromise(id, payload);
  }

  @ApiTags('CMS - Store Promises')
  @Patch('store-promises/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle store trust badge status' })
  async toggleStorePromiseStatus(@Param('id') id: string) {
    return this.cmsService.toggleStorePromiseStatus(id);
  }

  @ApiTags('CMS - Store Promises')
  @Delete('store-promises/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete store trust badge' })
  async deleteStorePromise(@Param('id') id: string) {
    return this.cmsService.deleteStorePromise(id);
  }
}
