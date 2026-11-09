import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import {
  getShippingRatesHandler,
  checkServiceabilityHandler,
  listCouriersHandler,
  requestPickupHandler,
  generateAwbHandler,
  cancelShipmentHandler,
  trackShipmentHandler,
  trackByInternalIdHandler,
  getShipmentDetailsHandler,
  getNdrShipmentsHandler,
  submitNdrActionHandler,
  getCodRemittanceHandler,
  listWarehousesHandler,
  addWarehouseHandler,
  addProductHandler,
  listProductsHandler,
} from '../../controllers/admin/shipping.js';

const router = Router();

router.use(authenticateAdmin);

// ========================================
// Shipping Rates & Serviceability
// ========================================
router.get('/shipping/rates', authorize('orders.read'), getShippingRatesHandler);
router.get('/shipping/serviceability', authorize('orders.read'), checkServiceabilityHandler);

// ========================================
// Couriers
// ========================================
router.get('/shipping/couriers', authorize('orders.read'), listCouriersHandler);

// ========================================
// Shipment Management
// ========================================
router.get('/shipping/shipment/:shipmentId', authorize('orders.read'), getShipmentDetailsHandler);
router.post('/shipping/awb', authorize('orders.update'), generateAwbHandler);
router.post('/shipping/pickup', authorize('orders.update'), requestPickupHandler);
router.post('/shipping/cancel', authorize('orders.update'), cancelShipmentHandler);

// ========================================
// Tracking
// ========================================
router.get('/shipping/track/awb/:awb', authorize('orders.read'), trackShipmentHandler);
router.get('/shipping/track/shipment/:shipmentId', authorize('orders.read'), trackByInternalIdHandler);

// ========================================
// NDR (Non-Delivery Reports)
// ========================================
router.get('/shipping/ndr', authorize('orders.read'), getNdrShipmentsHandler);
router.post('/shipping/ndr/:awb/action', authorize('orders.update'), submitNdrActionHandler);

// ========================================
// COD Remittance
// ========================================
router.get('/shipping/cod-remittance', authorize('orders.read'), getCodRemittanceHandler);

// ========================================
// Warehouses / Pickup Locations
// ========================================
router.get('/shipping/warehouses', authorize('orders.read'), listWarehousesHandler);
router.post('/shipping/warehouses', authorize('orders.update'), addWarehouseHandler);

// ========================================
// Product / SKU Catalog
// ========================================
router.get('/shipping/products', authorize('orders.read'), listProductsHandler);
router.post('/shipping/products', authorize('orders.update'), addProductHandler);

export default router;
