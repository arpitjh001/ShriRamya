import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] px-6 md:px-12 lg:px-24 py-16 flex items-center justify-center">
      <div className="max-w-xl text-center">
        <div className="text-6xl font-heading font-medium tracking-tight">404</div>
        <h1 className="mt-4 text-2xl md:text-3xl font-heading font-medium">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/products">Browse products</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

