import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { MainCategoriesController } from './main-categories.controller';
import { CategoriesController } from './categories.controller';
import { SubCategoriesController } from './subcategories.controller';

@Module({
  controllers: [
    MainCategoriesController,
    CategoriesController,
    SubCategoriesController,
  ],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
