-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('ABOUT', 'DELIVERY', 'PRIVACY', 'TERMS', 'RETURN_REFUND');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Customer',
    "email" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT '+91',
    "mobileNumber" TEXT,
    "fullPhoneNumber" TEXT,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT '+91',
    "mobileNumber" TEXT NOT NULL DEFAULT '',
    "fullPhoneNumber" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Retail',
    "address" TEXT NOT NULL DEFAULT '',
    "address1" TEXT NOT NULL DEFAULT '',
    "address2" TEXT NOT NULL DEFAULT '',
    "area" TEXT NOT NULL DEFAULT '',
    "landmark" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT 'TAMIL NADU',
    "pincode" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT 'Male',
    "dob" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "joinedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "area" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "landmark" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maincategories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maincategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "mainCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mainCategoryId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attributecaptions" (
    "id" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "values" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attributecaptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attributemappings" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attributemappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "offerText" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT 'Unisex',
    "mainCategoryId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    "hsnCode" TEXT NOT NULL DEFAULT '',
    "productImage" TEXT NOT NULL DEFAULT '',
    "secondaryImage" TEXT NOT NULL DEFAULT '',
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "certificates" TEXT[],
    "images" TEXT[],
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "attributes" JSONB,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "safetyCharacteristic" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productvariants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "skuCode" TEXT NOT NULL DEFAULT '',
    "mrp" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "offerPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gst" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gstMode" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
    "taxMode" TEXT NOT NULL DEFAULT 'CGST_SGST',
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "attributes" JSONB,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockStatus" TEXT NOT NULL DEFAULT 'In Stock',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productvariants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartitems" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "selectedAttributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cartitems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL DEFAULT 'AIS2408',
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerType" TEXT NOT NULL DEFAULT 'CUST',
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT,
    "billingAddress" JSONB,
    "shippingAddress" JSONB,
    "paymentMethod" TEXT NOT NULL DEFAULT 'Online',
    "paymentType" TEXT NOT NULL DEFAULT 'On',
    "cashfreePaymentId" TEXT NOT NULL DEFAULT '',
    "paymentGateway" TEXT NOT NULL DEFAULT 'Razorpay',
    "gatewayOrderId" TEXT NOT NULL DEFAULT '',
    "gatewayPaymentId" TEXT NOT NULL DEFAULT '',
    "transactionId" TEXT NOT NULL DEFAULT '',
    "paymentSessionId" TEXT NOT NULL DEFAULT '',
    "paymentMode" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "webhookVerified" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" TEXT NOT NULL DEFAULT '',
    "paymentAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastGatewayResponse" JSONB,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
    "orderStatus" TEXT NOT NULL DEFAULT 'Received',
    "refundStatus" TEXT NOT NULL DEFAULT 'None',
    "invoiceStatus" TEXT NOT NULL DEFAULT 'Pending',
    "invoiceNo" TEXT NOT NULL DEFAULT '',
    "invoiceGeneratedAt" TIMESTAMP(3),
    "total" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "packagingFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "insuranceFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gstTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "promoCode" TEXT NOT NULL DEFAULT '',
    "promoDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "promotionSnapshot" JSONB,
    "shippingSnapshot" JSONB,
    "courierId" TEXT,
    "returnReason" TEXT DEFAULT '',
    "returnStatus" TEXT DEFAULT 'NONE',
    "returnCourier" TEXT DEFAULT '',
    "returnTrackingNumber" TEXT DEFAULT '',
    "returnRequestedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returnrequests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "comments" TEXT DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "refundStatus" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "returnrequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderitems" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productImage" TEXT NOT NULL DEFAULT '',
    "variantId" TEXT,
    "sku" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orderitems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderpaymenttimelines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gateway" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orderpaymenttimelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderstatushistories" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedBy" TEXT NOT NULL DEFAULT 'System',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orderstatushistories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordershipmenttimelines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordershipmenttimelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couriermasters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "logo" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "apiType" TEXT NOT NULL DEFAULT 'Generic',
    "trackingUrlTemplate" TEXT NOT NULL DEFAULT '',
    "supportedStates" TEXT NOT NULL DEFAULT '',
    "supportedCountries" TEXT NOT NULL DEFAULT 'India',
    "maxWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDimensions" TEXT NOT NULL DEFAULT '',
    "codAvailable" BOOLEAN NOT NULL DEFAULT true,
    "insuranceAvailable" BOOLEAN NOT NULL DEFAULT false,
    "trackingAvailable" BOOLEAN NOT NULL DEFAULT true,
    "estimatedDeliveryDaysDomestic" INTEGER NOT NULL DEFAULT 3,
    "estimatedDeliveryDaysIntl" INTEGER NOT NULL DEFAULT 7,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couriermasters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promocodes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "discountType" TEXT NOT NULL DEFAULT 'Percentage',
    "discountValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maxDiscountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "minOrderAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maxOrderAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "usageLimit" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "targetComponent" TEXT NOT NULL DEFAULT 'Subtotal',
    "customerEligibility" TEXT NOT NULL DEFAULT 'All',
    "specificCustomerIds" TEXT[],
    "specificCustomerEmail" TEXT NOT NULL DEFAULT '',
    "allowedPaymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedPincodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mainCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productLimit" INTEGER NOT NULL DEFAULT 0,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "isStackable" BOOLEAN NOT NULL DEFAULT false,
    "badgeColor" TEXT NOT NULL DEFAULT '#D97706',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FEF3C7',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promocodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promousages" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promousages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL,
    "link" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactpages" (
    "id" TEXT NOT NULL,
    "pageTitle" TEXT DEFAULT 'Contact Us',
    "heading" TEXT DEFAULT 'Get In Touch',
    "description" TEXT DEFAULT '',
    "storeName" TEXT DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "secondaryPhone" TEXT DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "secondaryEmail" TEXT DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "mapUrl" TEXT NOT NULL DEFAULT '',
    "googleMapEmbed" TEXT DEFAULT '',
    "workingHours" TEXT NOT NULL DEFAULT '',
    "businessHours" TEXT DEFAULT '',
    "facebook" TEXT DEFAULT '',
    "instagram" TEXT DEFAULT '',
    "whatsapp" TEXT DEFAULT '',
    "youtube" TEXT DEFAULT '',
    "twitter" TEXT DEFAULT '',
    "linkedin" TEXT DEFAULT '',
    "pinterest" TEXT DEFAULT '',
    "seoTitle" TEXT DEFAULT '',
    "seoDescription" TEXT DEFAULT '',
    "seoKeywords" TEXT DEFAULT '',
    "ogImage" TEXT DEFAULT '',
    "branches" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contactpages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverychargerules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricingMethod" TEXT NOT NULL DEFAULT 'FLAT',
    "minWeight" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "maxWeight" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "maxQuantity" INTEGER NOT NULL DEFAULT 0,
    "baseCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "perKgCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "perItemCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryTypes" JSONB,
    "zoneId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverychargerules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveryzones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Domestic',
    "country" TEXT NOT NULL DEFAULT 'India',
    "states" TEXT[],
    "district" TEXT NOT NULL DEFAULT '',
    "pincodes" TEXT[],
    "exclusivePincodes" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "serviceable" BOOLEAN NOT NULL DEFAULT true,
    "estimatedDeliveryDays" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveryzones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featuredsections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "seoKeywordDescription" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Grid',
    "selectType" TEXT,
    "gridType" TEXT,
    "carouselType" TEXT,
    "mediaType" TEXT,
    "productStyle" TEXT,
    "productIds" TEXT[],
    "items" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featuredsections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoicecounters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'invoice',
    "seq" INTEGER NOT NULL DEFAULT 100000,
    "year" INTEGER NOT NULL DEFAULT 2026,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoicecounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderflowsettings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "autoConfirm" BOOLEAN NOT NULL DEFAULT false,
    "requirePincodeCheck" BOOLEAN NOT NULL DEFAULT true,
    "allowCancellation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orderflowsettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "hashedOtp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packagingrules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "boxSize" TEXT NOT NULL DEFAULT '',
    "charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packagingrules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paymenterrors" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "gateway" TEXT NOT NULL,
    "errorCode" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT NOT NULL,
    "rawError" JSONB,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paymenterrors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paymentgatewaysettings" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "credentials" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paymentgatewaysettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paymenttransactions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "gatewayResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paymenttransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrollheadings" (
    "id" TEXT NOT NULL,
    "title" TEXT DEFAULT '',
    "text" TEXT NOT NULL,
    "link" TEXT DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "backgroundColor" TEXT DEFAULT '#d98896',
    "color" TEXT DEFAULT '#ffffff',
    "fontFamily" TEXT DEFAULT 'Outfit',
    "fontSize" TEXT DEFAULT '14px',
    "fontStyle" TEXT DEFAULT 'normal',
    "fontWeight" TEXT DEFAULT '700',
    "letterSpacing" TEXT DEFAULT 'normal',
    "speed" INTEGER DEFAULT 6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scrollheadings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shippinglogs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courier" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shippinglogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shippingsettings" (
    "id" TEXT NOT NULL,
    "defaultWarehouseId" TEXT,
    "enableVolumetricWeight" BOOLEAN NOT NULL DEFAULT true,
    "volumetricDivisor" INTEGER NOT NULL DEFAULT 5000,
    "freeShippingMinAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shippingsettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storepromises" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storepromises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todaysdeals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "seoKeywordDescription" TEXT,
    "type" TEXT DEFAULT 'main_category',
    "selectType" TEXT,
    "gridType" TEXT,
    "carouselType" TEXT,
    "mediaType" TEXT,
    "productStyle" TEXT,
    "productIds" TEXT[],
    "items" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "discountText" TEXT DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todaysdeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todaysdealbanners" (
    "id" TEXT NOT NULL,
    "title" TEXT DEFAULT '',
    "image" TEXT DEFAULT '',
    "link" TEXT DEFAULT '',
    "linkType" TEXT DEFAULT '',
    "linkId" TEXT DEFAULT '',
    "linkUrl" TEXT DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todaysdealbanners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditlogs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sellers" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "sellerType" TEXT NOT NULL,
    "gstNumber" TEXT DEFAULT '',
    "panNumber" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "businessLocation" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "productCategory" TEXT NOT NULL,
    "agreementAccepted" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT DEFAULT '',
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "type" "PolicyType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adminsessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adminsessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_fullPhoneNumber_key" ON "users"("fullPhoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerId_key" ON "customers"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_userId_key" ON "customers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_fullPhoneNumber_key" ON "customers"("fullPhoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderId_key" ON "orders"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "returnrequests_orderId_key" ON "returnrequests"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "couriermasters_code_key" ON "couriermasters"("code");

-- CreateIndex
CREATE UNIQUE INDEX "promocodes_code_key" ON "promocodes"("code");

-- CreateIndex
CREATE INDEX "promousages_promoCodeId_idx" ON "promousages"("promoCodeId");

-- CreateIndex
CREATE INDEX "promousages_userId_idx" ON "promousages"("userId");

-- CreateIndex
CREATE INDEX "promousages_orderId_idx" ON "promousages"("orderId");

-- CreateIndex
CREATE INDEX "promousages_promoCodeId_userId_idx" ON "promousages"("promoCodeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "deliveryzones_code_key" ON "deliveryzones"("code");

-- CreateIndex
CREATE UNIQUE INDEX "invoicecounters_name_key" ON "invoicecounters"("name");

-- CreateIndex
CREATE UNIQUE INDEX "otps_phone_key" ON "otps"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "paymentgatewaysettings_gateway_key" ON "paymentgatewaysettings"("gateway");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_sellerId_key" ON "sellers"("sellerId");

-- CreateIndex
CREATE INDEX "sellers_status_idx" ON "sellers"("status");

-- CreateIndex
CREATE INDEX "sellers_email_idx" ON "sellers"("email");

-- CreateIndex
CREATE INDEX "sellers_mobileNumber_idx" ON "sellers"("mobileNumber");

-- CreateIndex
CREATE INDEX "sellers_panNumber_idx" ON "sellers"("panNumber");

-- CreateIndex
CREATE UNIQUE INDEX "policies_type_key" ON "policies"("type");

-- CreateIndex
CREATE UNIQUE INDEX "policies_slug_key" ON "policies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "adminsessions_jti_key" ON "adminsessions"("jti");

-- CreateIndex
CREATE INDEX "adminsessions_userId_idx" ON "adminsessions"("userId");

-- CreateIndex
CREATE INDEX "adminsessions_isRevoked_revokedAt_idx" ON "adminsessions"("isRevoked", "revokedAt");

-- CreateIndex
CREATE INDEX "adminsessions_expiresAt_idx" ON "adminsessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_mainCategoryId_fkey" FOREIGN KEY ("mainCategoryId") REFERENCES "maincategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_mainCategoryId_fkey" FOREIGN KEY ("mainCategoryId") REFERENCES "maincategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_mainCategoryId_fkey" FOREIGN KEY ("mainCategoryId") REFERENCES "maincategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productvariants" ADD CONSTRAINT "productvariants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartitems" ADD CONSTRAINT "cartitems_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartitems" ADD CONSTRAINT "cartitems_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "couriermasters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returnrequests" ADD CONSTRAINT "returnrequests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returnrequests" ADD CONSTRAINT "returnrequests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitems" ADD CONSTRAINT "orderitems_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitems" ADD CONSTRAINT "orderitems_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderpaymenttimelines" ADD CONSTRAINT "orderpaymenttimelines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderstatushistories" ADD CONSTRAINT "orderstatushistories_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordershipmenttimelines" ADD CONSTRAINT "ordershipmenttimelines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promousages" ADD CONSTRAINT "promousages_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promocodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promousages" ADD CONSTRAINT "promousages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promousages" ADD CONSTRAINT "promousages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverychargerules" ADD CONSTRAINT "deliverychargerules_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "deliveryzones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditlogs" ADD CONSTRAINT "auditlogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adminsessions" ADD CONSTRAINT "adminsessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

