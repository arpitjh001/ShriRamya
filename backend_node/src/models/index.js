const Product = require('./product.model');
const User = require('./user.model');
const Order = require('./order.model');
const Blog = require('./blog.model');
const Wishlist = require('./wishlist.model');
const Cart = require('./cart.model');
const Review = require('./review.model');
const Coupon = require('./coupon.model');
const InventoryAuditLog = require('./inventoryAudit.model');
const Role = require('./role.model');
const Permission = require('./permission.model');
const Tenant = require('./tenant.model');
const Category = require('./category.model');
const SubcategoryGroup = require('./subcategoryGroup.model');
const SubcategoryValue = require('./subcategoryValue.model');

const { DailyStats, ProductPerformance } = require('./analyticsStats.model');
const { Warehouse, WarehouseInventory } = require('./warehouse.model');
const Refund = require('./refund.model');
const OrderEvent = require('./orderEvent.model');
const Notification = require('./notification.model');
const EmailTemplate = require('./emailTemplate.model');
const EmailLog = require('./emailLog.model');
const FraudRule = require('./fraudRule.model');
const FraudLog = require('./fraudLog.model');
const Shipment = require('./shipment.model');
const { Payment, PaymentLog } = require('./payment.model');

module.exports = { 
  Product, User, Order, Blog, Wishlist, Cart, 
  Review, Coupon, InventoryAuditLog, 
  Role, Permission, Tenant,
  Category, SubcategoryGroup, SubcategoryValue,
  DailyStats, ProductPerformance,
  Warehouse, WarehouseInventory,
  Refund, OrderEvent, Notification,
  EmailTemplate, EmailLog,
  FraudRule, FraudLog,
  Shipment, Payment, PaymentLog
};
