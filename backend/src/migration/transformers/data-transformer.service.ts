import { Injectable } from '@nestjs/common';
import { generateObjectId } from '../../common/utils/object-id.util';

@Injectable()
export class DataTransformerService {

  // Helper to convert MongoDB _id to 24-char hex string
  private transformId(mongoDoc: any): string {
    if (!mongoDoc) return generateObjectId();
    if (typeof mongoDoc === 'string') return mongoDoc;
    if (mongoDoc._id) return String(mongoDoc._id);
    if (mongoDoc.id) return String(mongoDoc.id);
    return generateObjectId();
  }

  // 1. User Transformer
  transformUser(doc: any) {
    const id = this.transformId(doc);
    return {
      id,
      name: doc.name || 'User',
      username: doc.username || doc.mobileNumber || id,
      email: doc.email ? String(doc.email).trim().toLowerCase() : null,
      fullPhoneNumber: doc.fullPhoneNumber || doc.mobileNumber || '',
      countryCode: doc.countryCode || '+91',
      mobileNumber: doc.mobileNumber || '',
      password: doc.password || '', // Preserved exact legacy hash!
      role: doc.role || 'Customer',
      accountStatus: doc.accountStatus || 'ACTIVE',
      isDeleted: Boolean(doc.isDeleted),
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    };
  }

  // 2. Customer Transformer
  transformCustomer(doc: any) {
    const id = this.transformId(doc);
    return {
      id,
      customerId: doc.customerId || `CUST-${id.slice(-6)}`,
      userId: doc.user ? String(doc.user) : null,
      name: doc.name || 'Customer',
      email: doc.email ? String(doc.email).trim().toLowerCase() : '',
      phone: doc.phone || doc.mobileNumber || '',
      countryCode: doc.countryCode || '+91',
      mobileNumber: doc.mobileNumber || doc.phone || '',
      fullPhoneNumber: doc.fullPhoneNumber || '',
      gender: doc.gender || 'Male',
      dob: doc.dob ? String(doc.dob) : null,
      address1: doc.address1 || '',
      address2: doc.address2 || '',
      area: doc.area || '',
      landmark: doc.landmark || '',
      city: doc.city || '',
      state: doc.state || 'TAMIL NADU',
      pincode: doc.pincode || '',
      status: doc.status || 'Active',
      isDeleted: Boolean(doc.isDeleted),
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    };
  }

  // 3. Address Transformer
  transformAddress(doc: any) {
    const id = this.transformId(doc);
    return {
      id,
      userId: doc.userId ? String(doc.userId) : generateObjectId(),
      name: doc.name || 'Default Name',
      phone: doc.phone || '',
      email: doc.email || '',
      addressLine1: doc.addressLine1 || doc.address || '',
      addressLine2: doc.addressLine2 || doc.address2 || '',
      area: doc.area || '',
      city: doc.city || '',
      state: doc.state || 'TAMIL NADU',
      pincode: doc.pincode || '',
      landmark: doc.landmark || '',
      isDefault: Boolean(doc.isDefault),
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    };
  }

  // 4. Product & Variants Transformer
  transformProduct(doc: any) {
    const id = this.transformId(doc);
    const variants: any[] = [];

    const rawVariants = Array.isArray(doc.productDetails) ? doc.productDetails : [];
    for (const v of rawVariants) {
      const vId = this.transformId(v);
      variants.push({
        id: vId,
        productId: id,
        sku: v.sku || v.skuCode || `SKU-${vId.slice(-6)}`,
        purity: v.purity || '22K',
        grossWeight: Number(v.grossWeight || 0),
        netWeight: Number(v.netWeight || 0),
        stoneWeight: Number(v.stoneWeight || 0),
        makingCharges: Number(v.makingChargesAmount || 0),
        vaPercent: Number(v.vaPercent || 0),
        price: Number(v.finalPrice || v.price || doc.price || 0),
        stock: Number(v.stock || 0),
        status: v.status || 'Available',
      });
    }

    const productRecord = {
      id,
      name: doc.name || 'Unnamed Product',
      skuCode: doc.skuCode || `SKU-${id.slice(-6)}`,
      productImage: doc.productImage || (doc.images && doc.images[0]) || '',
      images: Array.isArray(doc.images) ? doc.images : [],
      description: doc.description || '',
      mainCategoryId: doc.mainCategory ? String(doc.mainCategory) : null,
      categoryId: doc.category ? String(doc.category) : null,
      subCategoryId: doc.subCategory ? String(doc.subCategory) : null,
      price: Number(doc.price || 0),
      stock: Number(doc.stock || 0),
      status: doc.status || 'Active',
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    };

    return { product: productRecord, variants };
  }

  // 5. Order & OrderItems Transformer
  transformOrder(doc: any) {
    const id = this.transformId(doc);
    const orderItems: any[] = [];

    const rawItems = Array.isArray(doc.items) ? doc.items : [];
    for (const item of rawItems) {
      const itemId = this.transformId(item);
      orderItems.push({
        id: itemId,
        orderId: id,
        productId: item.productId ? String(item.productId) : generateObjectId(),
        productName: item.name || 'Order Item',
        productImage: item.image || '',
        variantId: item.variantId ? String(item.variantId) : null,
        sku: item.sku || '',
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.basePrice || item.price || 0),
        totalPrice: Number(item.totalPrice || item.subtotal || 0),
        attributes: {
          variant: item.variant || '',
          purity: item.purity || '22K',
          metalColor: item.metalColor || 'Yellow',
          makingCharges: item.makingChargesAmount || 0,
          gst: item.gst || 0,
        },
      });
    }

    const orderRecord = {
      id,
      orderId: doc.orderId || `ORD-${id.slice(-6)}`,
      orderNo: doc.orderNo || `CliickG${id.slice(-4)}`,
      userId: doc.user ? String(doc.user) : null,
      customerName: doc.customerName || 'Customer',
      mobile: doc.mobile || '',
      email: doc.email || '',
      address: doc.address || '',
      paymentMethod: doc.paymentMethod || 'COD',
      paymentStatus: doc.paymentStatus || 'Pending',
      orderStatus: doc.orderStatus || 'Received',
      invoiceNo: doc.invoiceNo || '',
      total: Number(doc.total || 0),
      subtotal: Number(doc.subtotal || 0),
      shippingFee: Number(doc.shippingFee || 0),
      packagingFee: Number(doc.packagingFee || 0),
      gstTotal: Number(doc.gstTotal || 0),
      promoCode: doc.promoCode || '',
      promoDiscount: Number(doc.promoDiscount || 0),
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    };

    return { order: orderRecord, orderItems };
  }
}
