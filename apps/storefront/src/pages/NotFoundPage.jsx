import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Search } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="bg-cream min-h-screen pt-32 md:pt-40 pb-20 px-6 flex flex-col items-center justify-center text-center">
      <p className="font-serif text-6xl md:text-8xl text-pink-primary leading-none mb-4">404</p>
      <h1 className="font-serif text-2xl md:text-4xl text-charcoal mb-4">
        Page Not Found
      </h1>
      <p className="font-sans text-sm md:text-base text-charcoal/60 max-w-md mb-8 leading-relaxed">
        The page you are looking for doesn't exist or may have been moved. Let's get you back to something beautiful.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Button onClick={handleBack} className="w-full sm:w-auto inline-flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
        <Button onClick={() => navigate('/')} variant="outline" className="w-full sm:w-auto inline-flex items-center justify-center gap-2">
          <Home className="w-4 h-4" />
          Back to Home
        </Button>
        <Link
          to="/products"
          className="inline-flex items-center justify-center gap-2 text-sm font-sans font-medium text-pink-dark hover:text-pink-primary transition-colors px-4 py-2"
        >
          <Search className="w-4 h-4" />
          Browse Products
        </Link>
      </div>
    </div>
  );
}
