import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product } from '../../models/Product.js';
import { ProductVariant } from '../../models/ProductVariant.js';
import { Inventory } from '../../models/Inventory.js';
import { sendSuccess, sendPaginated } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateUniqueSKU } from '../../utils/skuGenerator.js';

function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  let createdProductId: any = null;
  let createdVariantIds: any[] = [];
  try {
    // Yahan productData ke andar frontend se isNewArrival: true/false aa raha hai
    const { variants, ...productData } = req.body;

    let slug = productData.slug;
    let existing = await Product.findOne({ slug });
    let counter = 1;
    while (existing) {
      slug = `${productData.slug}-${counter}`;
      existing = await Product.findOne({ slug });
      counter++;
    }
    productData.slug = slug;

    // 1. Create Product
    const product = await Product.create(productData);
    createdProductId = product._id;

    // 2. Create Variants & Inventory
    const prefix = productData.skuPrefix || 'TLS';
    const variantsToCreate = [];
    
    for (const v of variants) {
      let uniqueSku = generateUniqueSKU(prefix);
      while (await ProductVariant.exists({ sku: uniqueSku })) {
        uniqueSku = generateUniqueSKU(prefix);
      }
      variantsToCreate.push({ ...v, sku: uniqueSku, productId: product._id });
    }

    const createdVariants = await ProductVariant.insertMany(variantsToCreate);
    createdVariantIds = createdVariants.map((v: any) => v._id);

    const inventoryDocs = createdVariants.map((v: any, index: number) => {
      const variantInput = variants[index];
      return {
        variantId: v._id,
        available: variantInput.inventory?.available || 0,
        lowStockThreshold: variantInput.inventory?.lowStockThreshold || 5,
        trackInventory: variantInput.inventory?.trackInventory ?? true,
        allowBackorder: variantInput.inventory?.allowBackorder ?? false,
      };
    });

    await Inventory.insertMany(inventoryDocs);

    sendSuccess({ res, statusCode: 201, data: product, message: 'Product created successfully' });
  } catch (error: any) {
    console.error('CREATE PRODUCT ERROR:', error);
    if (createdProductId) await Product.deleteOne({ _id: createdProductId }).catch(e => console.error(e));
    if (createdVariantIds.length > 0) {
      await ProductVariant.deleteMany({ _id: { $in: createdVariantIds } }).catch(e => console.error(e));
      await Inventory.deleteMany({ variantId: { $in: createdVariantIds } }).catch(e => console.error(e));
    }
    if (error.code === 11000 || error.name === 'MongoBulkWriteError') {
      next(ApiError.conflict('A product or variant with this SKU already exists.'));
      return;
    }
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (req.body.slug) {
      let slug = req.body.slug;
      let existing = await Product.findOne({ slug, _id: { $ne: id } });
      let counter = 1;
      while (existing) {
        slug = `${req.body.slug}-${counter}`;
        existing = await Product.findOne({ slug, _id: { $ne: id } });
        counter++;
      }
      req.body.slug = slug;
    }

    const { variants, ...updateData } = req.body;

    // Yahan maine { returnDocument: 'after' } add kiya hai taaki false values bhi update hon
    const product = await Product.findByIdAndUpdate(id, updateData, { 
      new: true, 
      runValidators: true,
      returnDocument: 'after' 
    });
    
    if (!product) {
      throw ApiError.notFound('Product');
    }

    sendSuccess({ res, data: product, message: 'Product updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateProductVariants(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: productId } = req.params;
    const { variants } = req.body;

    const product = await Product.findById(productId);
    if (!product) throw ApiError.notFound('Product');

    const existingVariants = await ProductVariant.find({ productId, deletedAt: null });
    const existingIds = existingVariants.map(v => v._id.toString());
    const payloadIds = variants.filter((v: any) => v._id).map((v: any) => v._id);

    const idsToDelete = existingIds.filter(id => !payloadIds.includes(id));
    if (idsToDelete.length > 0) {
      for (const delId of idsToDelete) {
        const variantToDel = existingVariants.find(v => v._id.toString() === delId);
        if (variantToDel) {
          await ProductVariant.findByIdAndUpdate(delId, {
            isActive: false, deletedAt: new Date(), sku: `${variantToDel.sku}-del-${Date.now()}`
          });
        }
      }
    }

    const variantsToUpdate = variants.filter((v: any) => v._id);
    for (const vData of variantsToUpdate) {
      await ProductVariant.findByIdAndUpdate(vData._id, vData);
      if (vData.inventory) {
        await Inventory.findOneAndUpdate(
          { variantId: vData._id },
          { available: vData.inventory.available, lowStockThreshold: vData.inventory.lowStockThreshold || 5, trackInventory: vData.inventory.trackInventory ?? true }
        );
      }
    }

    const variantsToCreate = variants.filter((v: any) => !v._id).map((v: any) => ({ ...v, productId }));
    if (variantsToCreate.length > 0) {
      const prefix = product.skuPrefix || 'TLS';
      for (const v of variantsToCreate) {
        let uniqueSku = generateUniqueSKU(prefix);
        while (await ProductVariant.exists({ sku: uniqueSku })) uniqueSku = generateUniqueSKU(prefix);
        v.sku = uniqueSku;
      }
      const created = await ProductVariant.insertMany(variantsToCreate);
      const inventoryDocs = created.map((v: any, index: number) => {
        const vInput = variantsToCreate[index];
        return { variantId: v._id, available: vInput.inventory?.available || 0, lowStockThreshold: vInput.inventory?.lowStockThreshold || 5, trackInventory: vInput.inventory?.trackInventory ?? true };
      });
      await Inventory.insertMany(inventoryDocs);
    }

    sendSuccess({ res, message: 'Product variants updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { deletedAt: null };
    if (req.query.status) query.status = req.query.status;
    if (req.query.room) query.roomIds = new mongoose.Types.ObjectId(req.query.room as string);
    if (req.query.category) query.categoryIds = new mongoose.Types.ObjectId(req.query.category as string);
    if (req.query.subcategory) query.subCategoryIds = new mongoose.Types.ObjectId(req.query.subcategory as string);
    
    if (req.query.search) {
      const s = String(req.query.search).trim();
      if (s) {
        if (mongoose.Types.ObjectId.isValid(s) && s.length === 24) {
          query._id = new mongoose.Types.ObjectId(s);
        } else {
          const tokens = s.split(/\s+/).filter(Boolean);
          if (tokens.length === 1) {
            const regex = new RegExp(escapeRegex(tokens[0]), 'i');
            query.$or = [{ name: regex }, { slug: regex }];
            const primaryCount = await Product.countDocuments(query);
            if (primaryCount === 0) {
              const skuProductIds = await ProductVariant.find({ sku: regex, deletedAt: null }).distinct('productId');
              delete query.$or;
              query._id = { $in: skuProductIds };
            }
          } else {
            query.$and = await Promise.all(
              tokens.map(async (t) => {
                const regex = new RegExp(escapeRegex(t), 'i');
                const skuProductIds = await ProductVariant.find({ sku: regex, deletedAt: null }).distinct('productId');
                return { $or: [{ name: regex }, { slug: regex }, { tags: regex }, { brand: regex }, { _id: { $in: skuProductIds } }] };
              })
            );
          }
        }
      }
    }

    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('roomIds', 'name slug').populate('categoryIds', 'name slug').lean(),
      Product.countDocuments(query),
    ]);

    const productIds = products.map(p => p._id);
    const variants = await ProductVariant.find({ productId: { $in: productIds }, deletedAt: null }).lean();
    const variantIds = variants.map(v => v._id);
    const inventories = await Inventory.find({ variantId: { $in: variantIds } }).lean();
    const inventoryMap = new Map(inventories.map(inv => [inv.variantId.toString(), inv]));

    const variantsByProduct = new Map();
    for (const v of variants) {
      const pId = v.productId.toString();
      if (!variantsByProduct.has(pId)) variantsByProduct.set(pId, []);
      variantsByProduct.get(pId).push({ ...v, inventory: inventoryMap.get(v._id.toString()) || null });
    }

    const productsWithVariants = products.map(p => ({ ...p, variants: variantsByProduct.get(p._id.toString()) || [] }));

    sendPaginated(res, productsWithVariants, {
      page, limit, total, totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total, hasPreviousPage: page > 1,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUniqueColors(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await Product.aggregate([
      { $match: { deletedAt: null } },
      { $unwind: "$attributes" },
      { $match: { "attributes.name": { $regex: /^colou?r$/i } } },
      { $unwind: "$attributes.values" },
      { $group: { _id: "$attributes.values" } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, color: "$_id" } }
    ]);
    sendSuccess({ res, data: result.map(r => r.color).filter(Boolean) });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, deletedAt: null }).populate('roomIds', 'name slug').populate('collectionIds', 'name slug').populate('categoryIds', 'name slug').populate('subCategoryIds', 'name slug').lean();
    if (!product) throw ApiError.notFound('Product');

    const variants = await ProductVariant.find({ productId: product._id, deletedAt: null }).lean();
    const variantIds = variants.map((v) => v._id);
    const inventories = await Inventory.find({ variantId: { $in: variantIds } }).lean();
    const inventoryMap = new Map(inventories.map((inv) => [inv.variantId.toString(), inv]));
    const variantsWithInventory = variants.map((v) => ({ ...v, inventory: inventoryMap.get(v._id.toString()) || null }));

    sendSuccess({ res, data: { ...product, variants: variantsWithInventory } });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(id, { deletedAt: new Date(), status: 'archived' }, { new: true });
    if (!product) throw ApiError.notFound('Product');
    await ProductVariant.updateMany({ productId: id }, { isActive: false, deletedAt: new Date() });
    sendSuccess({ res, message: 'Product archived successfully' });
  } catch (error) {
    next(error);
  }
}