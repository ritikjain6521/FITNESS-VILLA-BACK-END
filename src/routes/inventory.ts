import { Router } from 'express';
import { z } from 'zod';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import StockMovement from '../models/StockMovement.js';
import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import GymSettings from '../models/GymSettings.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generateSaleReceiptWhatsApp } from '../services/notificationService.js';

const router = Router();
router.use(requireAuth);
router.use(allowRoles('admin', 'staff'));

// ─── Suppliers ────────────────────────────────────────────
router.get('/suppliers', async (_req, res, next) => {
  try {
    const items = await Supplier.find({ active: true }).sort({ name: 1 });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/suppliers',
  allowRoles('admin'),
  validate(
    z.object({
      body: z.object({
        name: z.string().trim().min(2).max(150),
        contactPerson: z.string().max(100).optional(),
        phone: z.string().max(25).optional(),
        email: z.string().email().max(254).optional(),
        address: z.string().max(400).optional(),
        gstin: z.string().max(20).optional(),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const item = await Supplier.create(req.body);
      res.status(201).json({ item });
    } catch (e) {
      next(e);
    }
  }
);

// ─── Products ─────────────────────────────────────────────
router.get('/products', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const filter: any = { active: true };
    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(String(req.query.search), 'i') },
        { sku: new RegExp(String(req.query.search), 'i') },
      ];
    }
    if (req.query.lowStock === 'true') {
      filter.$expr = { $lte: ['$currentQty', '$reorderThreshold'] };
    }
    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate('supplier', 'name phone')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/products',
  allowRoles('admin'),
  validate(
    z.object({
      body: z.object({
        sku: z.string().trim().min(1).max(50),
        name: z.string().trim().min(2).max(150),
        category: z.string().max(80).optional(),
        brand: z.string().max(80).optional(),
        unit: z.string().max(20).optional(),
        purchasePricePaise: z.number().int().min(0).optional(),
        sellingPricePaise: z.number().int().min(0),
        currentQty: z.number().int().min(0).optional(),
        taxRate: z.number().min(0).max(100).optional(),
        reorderThreshold: z.number().int().min(0).optional(),
        supplier: z.string().length(24).optional(),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const item = await Product.create(req.body);
      res.status(201).json({ item });
    } catch (e) {
      next(e);
    }
  }
);

router.patch('/products/:id', allowRoles('admin'), async (req, res, next) => {
  try {
    const data = z
      .object({
        name: z.string().trim().min(2).max(150).optional(),
        category: z.string().max(80).optional(),
        sellingPricePaise: z.number().int().min(0).optional(),
        purchasePricePaise: z.number().int().min(0).optional(),
        reorderThreshold: z.number().int().min(0).optional(),
        currentQty: z.number().int().min(0).optional(),
        active: z.boolean().optional(),
      })
      .parse(req.body);
    const item = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Product not found' });
    res.json({ item });
  } catch (e) {
    next(e);
  }
});

// ─── Stock Adjustment ─────────────────────────────────────
router.post(
  '/products/:id/adjust',
  allowRoles('admin'),
  validate(z.object({ body: z.object({ qtyChange: z.number().int(), reason: z.string().max(300).optional() }) })),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const product = await Product.findById(req.params.id).session(session);
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Product not found' });
      }
      const before = product.currentQty;
      const after = before + req.body.qtyChange;
      if (after < 0) {
        await session.abortTransaction();
        return res.status(409).json({ message: 'Insufficient stock' });
      }
      product.currentQty = after;
      await product.save({ session });
      await StockMovement.create(
        [
          {
            product: product._id,
            type: 'adjustment',
            qtyChange: req.body.qtyChange,
            qtyBefore: before,
            qtyAfter: after,
            reason: req.body.reason || '',
            recordedBy: req.user!.id,
            date: new Date(),
          },
        ],
        { session }
      );
      await session.commitTransaction();
      res.json({ item: product });
    } catch (e) {
      await session.abortTransaction();
      next(e);
    } finally {
      session.endSession();
    }
  }
);

// ─── Stock Inward / Purchases from Suppliers ──────────────
const purchaseSchema = z.object({
  body: z.object({
    supplier: z.string().length(24).optional().nullable(),
    supplierName: z.string().max(150).optional(),
    invoiceNumber: z.string().max(100).optional(),
    paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'card', 'credit', 'other']).default('bank_transfer'),
    notes: z.string().max(300).optional(),
    items: z
      .array(
        z.object({
          product: z.string().length(24).optional(),
          name: z.string().max(150).optional(),
          category: z.string().max(80).optional(),
          sku: z.string().max(50).optional(),
          sellingPricePaise: z.number().int().min(0).optional(),
          qty: z.number().int().min(1),
          unitCostPaise: z.number().int().min(0),
        })
      )
      .min(1),
  }),
});

router.post('/purchases', allowRoles('admin'), validate(purchaseSchema), async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let totalPurchaseCostPaise = 0;
    const now = new Date();
    const invoice = req.body.invoiceNumber || `PUR-${Date.now().toString().slice(-6)}`;

    // Resolve or auto-register supplier from manual name entry
    let supplierName = 'Supplier';
    let supplierId = req.body.supplier || null;

    if (supplierId) {
      const s = await Supplier.findById(supplierId).session(session);
      if (s) supplierName = s.name;
    } else if (req.body.supplierName && req.body.supplierName.trim()) {
      const nameTrim = req.body.supplierName.trim();
      const escaped = nameTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let s = await Supplier.findOne({ name: new RegExp(`^${escaped}$`, 'i') }).session(session);
      if (!s) {
        const created = await Supplier.create([{ name: nameTrim }], { session });
        s = created[0];
      }
      supplierName = s.name;
      supplierId = s._id;
    }

    for (const line of req.body.items) {
      let product: any;

      if (line.product) {
        product = await Product.findById(line.product).session(session);
        if (!product) {
          await session.abortTransaction();
          return res.status(404).json({ message: `Product ${line.product} not found` });
        }
        const before = product.currentQty;
        product.currentQty += line.qty;
        product.purchasePricePaise = line.unitCostPaise;
        if (line.sellingPricePaise && line.sellingPricePaise > 0) {
          product.sellingPricePaise = line.sellingPricePaise;
        }
        if (supplierId && !product.supplier) {
          product.supplier = supplierId;
        }
        await product.save({ session });
      } else if (line.name && line.name.trim()) {
        const prodName = line.name.trim();
        const escapedProd = prodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let existing = await Product.findOne({ name: new RegExp(`^${escapedProd}$`, 'i') }).session(session);

        if (existing) {
          product = existing;
          const before = product.currentQty;
          product.currentQty += line.qty;
          product.purchasePricePaise = line.unitCostPaise;
          if (line.sellingPricePaise && line.sellingPricePaise > 0) {
            product.sellingPricePaise = line.sellingPricePaise;
          }
          if (supplierId && !product.supplier) {
            product.supplier = supplierId;
          }
          await product.save({ session });
        } else {
          // Generate a guaranteed unique SKU
          const cleanPart = prodName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'PROD';
          let sku = line.sku?.trim() || `${cleanPart}-${Date.now().toString().slice(-4)}`;
          let suffix = 1;
          while (await Product.findOne({ sku }).session(session)) {
            sku = `${cleanPart}-${Date.now().toString().slice(-4)}-${suffix++}`;
          }

          const sellingPrice =
            line.sellingPricePaise && line.sellingPricePaise > 0
              ? line.sellingPricePaise
              : Math.max(line.unitCostPaise, Math.round(line.unitCostPaise * 1.3)) || 10000;

          const created = await Product.create(
            [
              {
                sku,
                name: prodName,
                category: line.category?.trim() || 'Supplements',
                currentQty: line.qty,
                purchasePricePaise: line.unitCostPaise,
                sellingPricePaise: sellingPrice,
                reorderThreshold: 5,
                supplier: supplierId || null,
                active: true,
              },
            ],
            { session }
          );
          product = created[0];
        }
      } else {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Each item must have either an existing product or a product name' });
      }

      const lineTotal = line.qty * line.unitCostPaise;
      totalPurchaseCostPaise += lineTotal;

      await StockMovement.create(
        [
          {
            product: product._id,
            type: 'purchase',
            qtyChange: line.qty,
            qtyBefore: Math.max(0, product.currentQty - line.qty),
            qtyAfter: product.currentQty,
            unitCostPaise: line.unitCostPaise,
            sourceRef: invoice,
            reason: `Supplier purchase order ${invoice} (${supplierName})`,
            recordedBy: req.user!.id,
            date: now,
          },
        ],
        { session }
      );
    }

    // Automatically record an Expense under 'Supplements & Inventory' category
    let category = await ExpenseCategory.findOne({ name: 'Supplements & Inventory' }).session(session);
    if (!category) {
      category = (
        await ExpenseCategory.create(
          [
            {
              name: 'Supplements & Inventory',
              description: 'Stock inward purchases and inventory acquisition',
            },
          ],
          { session }
        )
      )[0];
    }

    await Expense.create(
      [
        {
          category: category._id,
          amountPaise: totalPurchaseCostPaise,
          vendor: supplierName,
          date: now,
          paymentMethod: req.body.paymentMethod === 'credit' ? 'bank_transfer' : req.body.paymentMethod,
          notes: `Stock Purchase: ${invoice}. ${req.body.notes || ''}`,
          recordedBy: req.user!.id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({
      message: 'Purchase recorded and stock updated successfully',
      invoiceNumber: invoice,
      totalPurchaseCostPaise,
    });
  } catch (e) {
    await session.abortTransaction();
    next(e);
  } finally {
    session.endSession();
  }
});

// ─── Inventory Stock, Purchases & Profit Analytics ─────────
router.get('/analytics', async (_req, res, next) => {
  try {
    const products = await Product.find({ active: true });

    let totalStockUnits = 0;
    let totalValuationCostPaise = 0;
    let totalValuationSellingPaise = 0;
    let lowStockCount = 0;

    for (const p of products) {
      totalStockUnits += p.currentQty;
      totalValuationCostPaise += p.currentQty * (p.purchasePricePaise || 0);
      totalValuationSellingPaise += p.currentQty * p.sellingPricePaise;
      if (p.currentQty <= p.reorderThreshold) lowStockCount++;
    }

    // Sales metrics
    const sales = await Sale.find({ isVoid: false }).lean();
    let totalSalesRevenuePaise = 0;
    let totalCOGS = 0;

    // Calculate COGS by matching product historical cost or current purchase cost
    const productCostMap = new Map<string, number>();
    products.forEach((p) => productCostMap.set(p._id.toString(), p.purchasePricePaise || 0));

    for (const s of sales) {
      totalSalesRevenuePaise += s.totalPaise;
      for (const item of s.items) {
        const cost = productCostMap.get(item.product?.toString()) || 0;
        totalCOGS += cost * item.qty;
      }
    }

    const grossProfitPaise = totalSalesRevenuePaise - totalCOGS;
    const grossMarginPercent =
      totalSalesRevenuePaise > 0 ? Math.round((grossProfitPaise / totalSalesRevenuePaise) * 100) : 0;

    res.json({
      totalProductsCount: products.length,
      totalStockUnits,
      totalValuationCostPaise,
      totalValuationSellingPaise,
      potentialProfitPaise: totalValuationSellingPaise - totalValuationCostPaise,
      lowStockCount,
      totalSalesCount: sales.length,
      totalSalesRevenuePaise,
      totalCOGS,
      grossProfitPaise,
      grossMarginPercent,
    });
  } catch (e) {
    next(e);
  }
});

// ─── Stock movements ──────────────────────────────────────
router.get('/products/:id/movements', async (req, res, next) => {
  try {
    const items = await StockMovement.find({ product: req.params.id })
      .populate('recordedBy', 'name')
      .sort({ date: -1 })
      .limit(200);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// ─── Sales (POS) ──────────────────────────────────────────
router.get('/sales', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const filter: any = { isVoid: false };
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(String(req.query.from));
      if (req.query.to) filter.createdAt.$lte = new Date(String(req.query.to));
    }
    const [items, total] = await Promise.all([
      Sale.find(filter)
        .populate('member', 'name phone email')
        .populate('recordedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Sale.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  } catch (e) {
    next(e);
  }
});

const saleSchema = z.object({
  body: z.object({
    member: z.string().length(24).optional(),
    customerName: z.string().max(100).optional(),
    customerPhone: z.string().max(25).optional(),
    items: z
      .array(
        z.object({
          product: z.string().length(24),
          qty: z.number().int().min(1),
        })
      )
      .min(1),
    paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'card', 'razorpay', 'other']).optional(),
    discountPaise: z.number().int().min(0).optional(),
    notes: z.string().max(300).optional(),
  }),
});

router.post('/sales', validate(saleSchema), async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const saleItems = [];
    let subtotal = 0;
    let totalTax = 0;
    const now = Date.now();

    for (const line of req.body.items) {
      const product = await Product.findById(line.product).session(session);
      if (!product || !product.active) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Product ${line.product} not found or inactive` });
      }
      if (product.currentQty < line.qty) {
        await session.abortTransaction();
        return res.status(409).json({ message: `Insufficient stock for ${product.name}. Available: ${product.currentQty}` });
      }

      const unitTax = Math.round(product.sellingPricePaise * ((product.taxRate || 0) / 100));
      const lineTotal = (product.sellingPricePaise + unitTax) * line.qty;
      subtotal += product.sellingPricePaise * line.qty;
      totalTax += unitTax * line.qty;

      const before = product.currentQty;
      product.currentQty -= line.qty;
      await product.save({ session });

      await StockMovement.create(
        [
          {
            product: product._id,
            type: 'sale',
            qtyChange: -line.qty,
            qtyBefore: before,
            qtyAfter: product.currentQty,
            unitCostPaise: product.purchasePricePaise,
            sourceRef: `sale-${now}`,
            recordedBy: req.user!.id,
            date: new Date(),
          },
        ],
        { session }
      );

      saleItems.push({
        product: product._id,
        productName: product.name,
        qty: line.qty,
        unitPricePaise: product.sellingPricePaise,
        taxRate: product.taxRate || 0,
        taxAmountPaise: unitTax * line.qty,
        totalPaise: lineTotal,
      });
    }

    const discount = req.body.discountPaise ?? 0;
    const total = subtotal + totalTax - discount;
    const counter = now.toString().slice(-6);

    const [sale] = await Sale.create(
      [
        {
          saleNumber: `SL-${counter}`,
          member: req.body.member || null,
          items: saleItems,
          subtotalPaise: subtotal,
          taxAmountPaise: totalTax,
          discountPaise: discount,
          totalPaise: total,
          paymentMethod: req.body.paymentMethod || 'cash',
          recordedBy: req.user!.id,
          notes: req.body.notes || '',
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Fetch member or custom customer info for receipt and WhatsApp sharing
    let memberData: any = null;
    if (req.body.member) {
      memberData = await User.findById(req.body.member).lean();
    } else if (req.body.customerName || req.body.customerPhone) {
      memberData = {
        name: req.body.customerName || 'Customer',
        phone: req.body.customerPhone || '',
      };
    }

    const settings = await GymSettings.findOne().lean();
    const whatsapp = generateSaleReceiptWhatsApp(sale, memberData, settings);

    res.status(201).json({
      item: sale,
      whatsappReceiptUrl: whatsapp.url,
      whatsappReceiptText: whatsapp.text,
    });
  } catch (e) {
    await session.abortTransaction();
    next(e);
  } finally {
    session.endSession();
  }
});

// Single Sale Receipt view
router.get('/sales/:id/receipt', async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('member', 'name email phone')
      .populate('recordedBy', 'name');
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const settings = await GymSettings.findOne().lean();
    const whatsapp = generateSaleReceiptWhatsApp(sale, sale.member, settings);

    res.json({
      sale,
      settings,
      whatsappReceiptUrl: whatsapp.url,
      whatsappReceiptText: whatsapp.text,
    });
  } catch (e) {
    next(e);
  }
});

// Delete product (soft-delete / deactivate)
router.delete('/products/:id', allowRoles('admin'), async (req, res, next) => {
  try {
    const item = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!item) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully', item });
  } catch (e) {
    next(e);
  }
});

// Delete/Void sale and restore stock
router.delete('/sales/:id', allowRoles('admin'), async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Sale not found' });
    }
    for (const line of sale.items) {
      if (line.product) {
        await Product.findByIdAndUpdate(line.product, { $inc: { currentQty: line.qty } }, { session });
        await StockMovement.create(
          [
            {
              product: line.product,
              type: 'adjustment',
              qtyChange: line.qty,
              qtyAfter: 0,
              reference: `Sale voided: ${sale.saleNumber}`,
              recordedBy: req.user!.id,
            },
          ],
          { session }
        );
      }
    }
    await Sale.findByIdAndDelete(req.params.id).session(session);
    await session.commitTransaction();
    res.json({ message: 'Sale deleted and stock restored' });
  } catch (e) {
    await session.abortTransaction();
    next(e);
  } finally {
    session.endSession();
  }
});

export default router;
