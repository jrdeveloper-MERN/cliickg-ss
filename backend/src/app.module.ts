import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AttributesModule } from './modules/attributes/attributes.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { CartModule } from './modules/cart/cart.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { CmsModule } from './modules/cms/cms.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    AttributesModule,
    ProductsModule,
    CustomersModule,
    AddressesModule,
    CartModule,
    ShippingModule,
    OrdersModule,
    PaymentsModule,
    CheckoutModule,
    PromotionsModule,
    CmsModule,
    DashboardModule,
    SellersModule,
    PoliciesModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

