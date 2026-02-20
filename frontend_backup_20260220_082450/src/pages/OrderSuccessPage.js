import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package } from 'lucide-react';
import { Button } from '../components/ui/button';
import { motion } from 'framer-motion';

const OrderSuccessPage = () => {
  const { orderId } = useParams();

  useEffect(() => {
    // Confetti or celebration animation could go here
  }, []);

  return (
    <div data-testid="order-success-page" className="px-6 md:px-12 lg:px-24 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto text-center py-16"
      >
        <CheckCircle className="h-24 w-24 mx-auto mb-6 text-primary" />
        <h1 className="text-4xl font-heading font-medium tracking-tight mb-4">
          Order Placed Successfully!
        </h1>
        <p className="text-lg text-muted-foreground mb-2">
          Thank you for shopping with Shri Ramya
        </p>
        <p className="text-muted-foreground mb-8">
          Order ID: <span className="font-medium" data-testid="order-id">{orderId}</span>
        </p>

        <div className="bg-muted rounded-lg p-8 mb-8">
          <Package className="h-12 w-12 mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium mb-2">Your order is being processed</p>
          <p className="text-sm text-muted-foreground">
            We'll send you a confirmation email with tracking details shortly.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button data-testid="view-order-button" asChild size="lg">
            <Link to="/account">View Orders</Link>
          </Button>
          <Button data-testid="continue-shopping-button" asChild variant="outline" size="lg">
            <Link to="/products">Continue Shopping</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderSuccessPage;