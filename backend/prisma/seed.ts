import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const randomBytes = crypto.randomBytes(5).toString('hex');
  const counterHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return `${timestamp}${randomBytes}${counterHex}`;
}

const INDIAN_STATES = [
  'TAMIL NADU',
  'TAMILNADU',
  'ANDHRA PRADESH',
  'ARUNACHAL PRADESH',
  'ASSAM',
  'BIHAR',
  'CHHATTISGARH',
  'GOA',
  'GUJARAT',
  'HARYANA',
  'HIMACHAL PRADESH',
  'JHARKHAND',
  'KARNATAKA',
  'KERALA',
  'MADHYA PRADESH',
  'MAHARASHTRA',
  'MANIPUR',
  'MEGHALAYA',
  'MIZORAM',
  'NAGALAND',
  'ODISHA',
  'PUNJAB',
  'RAJASTHAN',
  'SIKKIM',
  'TELANGANA',
  'TRIPURA',
  'UTTAR PRADESH',
  'UTTARAKHAND',
  'WEST BENGAL',
  'DELHI',
  'CHANDIGARH',
  'PUDUCHERRY',
  'JAMMU AND KASHMIR',
  'LADAKH',
  'ANDAMAN AND NICOBAR ISLANDS',
  'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  'LAKSHADWEEP',
];

async function seed() {
  console.log('[Seed] Starting idempotent baseline configuration seed...');

  // 1. Payment Gateway Baseline (Razorpay Test Mode from env)
  const rzpKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_Siw8IKYxgAwiWx';
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || 'bmDbFzQAHqC6wFwSJReop73y';
  const rzpEnv = process.env.RAZORPAY_ENVIRONMENT || 'sandbox';

  const existingGateway = await prisma.paymentGatewaySetting.findUnique({
    where: { gateway: 'razorpay' },
  });

  if (!existingGateway) {
    await prisma.paymentGatewaySetting.create({
      data: {
        id: generateObjectId(),
        gateway: 'razorpay',
        displayName: 'Razorpay',
        isEnabled: true,
        isDefault: true,
        environment: rzpEnv,
        credentials: {
          appId: rzpKeyId,
          secretKey: rzpKeySecret,
        },
      },
    });
    console.log('[Seed] Created default Razorpay payment gateway setting.');
  } else {
    await prisma.paymentGatewaySetting.update({
      where: { id: existingGateway.id },
      data: {
        isEnabled: true,
        isDefault: true,
        environment: rzpEnv,
        credentials: {
          appId: rzpKeyId,
          secretKey: rzpKeySecret,
        },
      },
    });
    console.log('[Seed] Updated existing Razorpay payment gateway setting.');
  }

  // 2. Delivery Zone Baseline (Domestic Standard Zone)
  const existingZone = await prisma.deliveryZone.findFirst({
    where: { code: 'DEFAULT_DOMESTIC', isDeleted: false },
  });

  let zoneId = existingZone?.id;

  if (!existingZone) {
    const createdZone = await prisma.deliveryZone.create({
      data: {
        id: generateObjectId(),
        name: 'Domestic Standard Zone',
        code: 'DEFAULT_DOMESTIC',
        type: 'Domestic',
        country: 'India',
        states: INDIAN_STATES,
        district: '',
        pincodes: [],
        exclusivePincodes: [],
        priority: 0,
        description: 'Default delivery zone covering domestic states',
        serviceable: true,
        estimatedDeliveryDays: 3,
        status: 'Active',
      },
    });
    zoneId = createdZone.id;
    console.log('[Seed] Created default domestic delivery zone.');
  } else {
    await prisma.deliveryZone.update({
      where: { id: existingZone.id },
      data: {
        states: INDIAN_STATES,
        serviceable: true,
        status: 'Active',
      },
    });
    console.log('[Seed] Verified existing domestic delivery zone.');
  }

  // 3. Delivery Charge Rule for Zone
  const existingRule = await prisma.deliveryChargeRule.findFirst({
    where: { zoneId, isDeleted: false },
  });

  if (!existingRule) {
    await prisma.deliveryChargeRule.create({
      data: {
        id: generateObjectId(),
        name: 'Standard Domestic Delivery',
        pricingMethod: 'FLAT',
        zoneId,
        minWeight: 0,
        maxWeight: 0,
        minQuantity: 0,
        maxQuantity: 0,
        baseCharge: 0,
        perKgCharge: 0,
        perItemCharge: 0,
        deliveryTypes: {
          Standard: {
            enabled: true,
            estimatedDays: 3,
            additionalCharge: 0,
          },
          Express: {
            enabled: true,
            estimatedDays: 1,
            additionalCharge: 50,
          },
        },
        status: 'Active',
      },
    });
    console.log('[Seed] Created standard delivery charge rule for zone.');
  } else {
    console.log('[Seed] Verified existing delivery charge rule for zone.');
  }

  console.log('[Seed] Baseline configuration seeding completed successfully.');
}

seed()
  .catch((err) => {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
