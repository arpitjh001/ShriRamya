/**
 * Swagger/OpenAPI Configuration
 * Auto-generated API documentation
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ShriRamya Ecommerce API',
    version: '2.0.0',
    description: 'Production-grade ecommerce platform API with enterprise features',
    contact: {
      name: 'API Support',
      email: 'support@shriramya.com'
    }
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api/v1`,
      description: 'Development server'
    },
    {
      url: 'https://api.shriramya.com/api/v1',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token'
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_token',
        description: 'Refresh token stored in HTTP-only cookie'
      }
    },
    schemas: {
      // Product Schema
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Silk Saree' },
          description: { type: 'string', example: 'Beautiful handloom silk saree' },
          slug: { type: 'string', example: 'silk-saree' },
          basePrice: { type: 'number', example: 5999 },
          status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          categories: { type: 'array', items: { type: 'integer' } },
          variants: { type: 'array', items: { $ref: '#/components/schemas/Variant' } },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      
      // Variant Schema
      Variant: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          sku: { type: 'string', example: 'SAREE-RED-M' },
          price: { type: 'number', example: 5999 },
          discountPrice: { type: 'number', nullable: true, example: 4999 },
          stock: { type: 'integer', example: 50 },
          attributes: { 
            type: 'object', 
            example: { color: 'Red', size: 'M', fabric: 'Silk' }
          },
          image: { type: 'string', nullable: true, format: 'uri' }
        }
      },

      // Order Schema
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          order_number: { type: 'string', example: 'ORD-2024-001' },
          user_id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          status: { 
            type: 'string', 
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
          },
          total_amount: { type: 'number', example: 10998 },
          payment_method: { type: 'string', enum: ['razorpay', 'cod', 'stripe'] },
          payment_status: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
          shipping_address: { type: 'object' },
          billing_address: { type: 'object' },
          is_flagged: { type: 'boolean', example: false },
          fraud_score: { type: 'integer', example: 0 },
          created_at: { type: 'string', format: 'date-time' }
        }
      },

      // Coupon Schema
      Coupon: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          code: { type: 'string', example: 'SAVE20' },
          type: { type: 'string', enum: ['percentage', 'flat', 'free_shipping', 'buy_x_get_y'] },
          value: { type: 'number', example: 20 },
          min_cart_value: { type: 'number', example: 1000 },
          max_discount: { type: 'number', nullable: true, example: 500 },
          usage_limit: { type: 'integer', nullable: true, example: 100 },
          used_count: { type: 'integer', example: 45 },
          starts_at: { type: 'string', format: 'date-time' },
          expires_at: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['active', 'inactive', 'expired'] }
        }
      },

      // Review Schema
      Review: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          product_id: { type: 'integer', example: 1 },
          user_id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          review_text: { type: 'string', example: 'Excellent quality!' },
          is_verified_purchase: { type: 'boolean', example: true },
          is_approved: { type: 'boolean', example: true },
          helpful_count: { type: 'integer', example: 12 },
          created_at: { type: 'string', format: 'date-time' }
        }
      },

      // Warehouse Schema
      Warehouse: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Mumbai Warehouse' },
          city: { type: 'string', example: 'Mumbai' },
          country: { type: 'string', example: 'India' },
          address: { type: 'string', example: 'Andheri East, Mumbai' },
          is_active: { type: 'boolean', example: true }
        }
      },

      // Analytics Schema
      AnalyticsSales: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                period: { type: 'string' },
                order_count: { type: 'integer' },
                total_revenue: { type: 'number' },
                avg_order_value: { type: 'number' }
              }
            }
          }
        }
      },

      // Error Response
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message' },
          stack: { type: 'string', nullable: true }
        }
      },

      // Success Response
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Success message' },
          data: { type: 'object' }
        }
      }
    }
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Products', description: 'Product management' },
    { name: 'Orders', description: 'Order management' },
    { name: 'Cart', description: 'Shopping cart' },
    { name: 'Coupons', description: 'Coupons and promotions' },
    { name: 'Search', description: 'Product search' },
    { name: 'Reviews', description: 'Product reviews and ratings' },
    { name: 'Recommendations', description: 'Product recommendations' },
    { name: 'Analytics', description: 'Analytics and reporting (Admin)' },
    { name: 'Warehouses', description: 'Warehouse management (Admin)' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Fraud', description: 'Fraud detection (Admin)' },
    { name: 'Upload', description: 'File uploads' }
  ]
};

const options = {
  swaggerDefinition,
  apis: [
    './src/routes/v1/*.js',
    './src/controllers/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerDocs = swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ShriRamya API Docs'
});

module.exports = {
  swaggerSpec,
  swaggerDocs,
  swaggerUi
};
