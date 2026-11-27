import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';
import { hashPassword } from '../src/utils/password.js';

import { Setting } from '../src/models/Setting.js';
import { Category } from '../src/models/Category.js';
import { SubCategory } from '../src/models/SubCategory.js';
import { Room } from '../src/models/Room.js';
import { Collection } from '../src/models/Collection.js';
import { Product } from '../src/models/Product.js';
import { ProductVariant } from '../src/models/ProductVariant.js';
import { Inventory } from '../src/models/Inventory.js';
import { User } from '../src/models/User.js';
import { Review } from '../src/models/Review.js';

// Base URL used inside stored image URLs (change for production deployment)
const API = process.env.SEED_API_URL || 'http://localhost:4000';
const IMG = (file: string) => `${API}/uploads/seed/${file}`;

// ---------- Colour palette (must match frontend colour hex map) ----------
const PALETTE: Record<string, string> = {
  Ivory: '#F5F1E8',
  Beige: '#D9CFC1',
  Sage: '#7C9885',
  Charcoal: '#2B3138',
  Navy: '#2E4570',
  Blush: '#DDBFC9',
  White: '#FFFFFF',
  Grey: '#808080',
  Blue: '#2E4570',
  Brown: '#A52A2A',
};
const colorVal = (c: string) => `${c} (${PALETTE[c] ?? '#CCCCCC'})`;
const makeSku = (slug: string, color: string, size: string) =>
  `${slug}-${color}-${size}`.toUpperCase().replace(/[^A-Z0-9]+/g, '-');

// ---------- Taxonomy ----------
const categories = [
  { name: 'Sheer Curtains', slug: 'sheer-curtains', image: IMG('sheer-premium-linen.jpg'), description: 'Light, airy sheers that filter sunlight beautifully.', sortOrder: 1 },
  { name: 'Blackout Curtains', slug: 'blackout-curtains', image: IMG('blackout-velvet.jpg'), description: 'Room-darkening curtains for privacy and comfort.', sortOrder: 2 },
  { name: 'Roller Blinds', slug: 'roller-blinds', image: IMG('roller-classic.jpg'), description: 'Sleek, functional roller blinds for every window.', sortOrder: 3 },
  { name: 'Wooden Blinds', slug: 'wooden-blinds', image: IMG('wooden-classic.jpg'), description: 'Warm, natural wooden and bamboo blinds.', sortOrder: 4 },
];

const subCategories = [
  { name: 'Linen Sheers', slug: 'linen-sheers', category: 'sheer-curtains', image: IMG('sheer-premium-linen.jpg'), sortOrder: 1 },
  { name: 'Voile Sheers', slug: 'voile-sheers', category: 'sheer-curtains', image: IMG('sheer-white.jpg'), sortOrder: 2 },
  { name: 'Velvet Blackout', slug: 'velvet-blackout', category: 'blackout-curtains', image: IMG('blackout-velvet.jpg'), sortOrder: 1 },
  { name: 'Thermal Blackout', slug: 'thermal-blackout', category: 'blackout-curtains', image: IMG('blackout-classic.jpg'), sortOrder: 2 },
  { name: 'Standard Roller', slug: 'standard-roller', category: 'roller-blinds', image: IMG('roller-classic.jpg'), sortOrder: 1 },
  { name: 'Blackout Roller', slug: 'blackout-roller', category: 'roller-blinds', image: IMG('roller-classic.jpg'), sortOrder: 2 },
  { name: 'Bamboo Blinds', slug: 'bamboo-blinds', category: 'wooden-blinds', image: IMG('wooden-bamboo.jpg'), sortOrder: 1 },
  { name: 'Wooden Venetian', slug: 'wooden-venetian', category: 'wooden-blinds', image: IMG('wooden-classic.jpg'), sortOrder: 2 },
];

const rooms = [
  { name: 'Living Room', slug: 'living-room', image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80', sortOrder: 1 },
  { name: 'Bedroom', slug: 'bedroom', image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80', sortOrder: 2 },
  { name: 'Kitchen', slug: 'kitchen', image: IMG('kitchen-classic.jpg'), sortOrder: 3 },
  { name: 'Office', slug: 'office', image: IMG('office-classic.jpg'), sortOrder: 4 },
];

const collections = [
  { name: 'Luxe Living', slug: 'luxe-living', image: IMG('blackout-velvet.jpg'), description: 'Statement blackout drapes for a luxe living space.', sortOrder: 1, isFeatured: true },
  { name: 'Summer Sheer', slug: 'summer-sheer', image: IMG('sheer-white.jpg'), description: 'Fresh, breezy sheers for bright summer days.', sortOrder: 2, isFeatured: true },
  { name: 'Warm Wood', slug: 'warm-wood', image: IMG('wooden-bamboo.jpg'), description: 'Natural bamboo and wooden window treatments.', sortOrder: 3, isFeatured: false },
  { name: 'Kitchen Charm', slug: 'kitchen-charm', image: IMG('kitchen-classic.jpg'), description: 'Airy curtains and blinds made for the heart of the home.', sortOrder: 4, isFeatured: false },
];

// ---------- Products (18 = 4-5 per category) ----------
interface SeedProduct {
  slug: string;
  name: string;
  shortDescription: string;
  category: string;
  subCategory: string;
  rooms: string[];
  collections: string[];
  tags: string[];
  colors: string[];
  sizes: string[];
  price: number;
  compareAtPrice: number;
  images: string[];
  featured?: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
  highlights?: string[];
  specs?: { name: string; value: string }[];
}

const products: SeedProduct[] = [
  // ===== Sheer Curtains =====
  {
    slug: 'premium-linen-sheer-curtains', name: 'Premium Linen Sheer Curtains',
    shortDescription: 'Soft premium linen sheers that filter light while keeping the room airy.',
    category: 'sheer-curtains', subCategory: 'linen-sheers', rooms: ['living-room', 'bedroom'], collections: ['summer-sheer'],
    tags: ['linen', 'sheer', 'premium'], colors: ['Ivory', 'Beige', 'White'], sizes: ['Standard', 'Custom'], price: 2499, compareAtPrice: 3299,
    images: [IMG('sheer-premium-linen.jpg'), IMG('sheer-white.jpg')], featured: true, newArrival: true,
    highlights: ['Premium linen blend', 'Light filtering', 'Custom sizing available'],
    specs: [{ name: 'Material', value: 'Linen blend' }, { name: 'Opacity', value: 'Sheer' }, { name: 'Header', value: 'Eyelet' }],
  },
  {
    slug: 'sheer-white-elegance-curtains', name: 'Sheer White Elegance Curtains',
    shortDescription: 'Crisp white voile sheers for a clean, elegant look.',
    category: 'sheer-curtains', subCategory: 'voile-sheers', rooms: ['living-room'], collections: ['summer-sheer'],
    tags: ['voile', 'white', 'elegant'], colors: ['White', 'Ivory'], sizes: ['Standard'], price: 1899, compareAtPrice: 2499,
    images: [IMG('sheer-white.jpg'), IMG('sheer-classic.jpg')], bestseller: true,
    specs: [{ name: 'Material', value: 'Polyester voile' }, { name: 'Opacity', value: 'Sheer' }],
  },
  {
    slug: 'classic-sheer-drapes', name: 'Classic Sheer Drapes',
    shortDescription: 'Everyday sheer drapes that soften natural light.',
    category: 'sheer-curtains', subCategory: 'linen-sheers', rooms: ['bedroom', 'office'], collections: ['summer-sheer'],
    tags: ['sheer', 'drapes'], colors: ['Ivory', 'Blush'], sizes: ['Standard'], price: 2099, compareAtPrice: 2699,
    images: [IMG('sheer-classic.jpg')], newArrival: true,
    specs: [{ name: 'Opacity', value: 'Sheer' }, { name: 'Wash', value: 'Machine washable' }],
  },
  {
    slug: 'ivory-voile-sheer-panel', name: 'Ivory Voile Sheer Panel',
    shortDescription: 'Single ivory voile panel for a soft glow.',
    category: 'sheer-curtains', subCategory: 'voile-sheers', rooms: ['kitchen'], collections: ['summer-sheer'],
    tags: ['voile', 'ivory'], colors: ['Ivory', 'White'], sizes: ['Standard'], price: 1599, compareAtPrice: 1999,
    images: [IMG('sheer-classic.jpg')],
    specs: [{ name: 'Opacity', value: 'Sheer' }],
  },
  {
    slug: 'textured-linen-blend-sheers', name: 'Textured Linen Blend Sheers',
    shortDescription: 'Textured linen sheers with a natural weave.',
    category: 'sheer-curtains', subCategory: 'linen-sheers', rooms: ['living-room', 'bedroom'], collections: ['summer-sheer'],
    tags: ['linen', 'textured'], colors: ['Beige', 'Sage'], sizes: ['Standard', 'Custom'], price: 2299, compareAtPrice: 2999,
    images: [IMG('sheer-premium-linen.jpg')], featured: true,
    specs: [{ name: 'Material', value: 'Textured linen blend' }, { name: 'Opacity', value: 'Sheer' }],
  },

  // ===== Blackout Curtains =====
  {
    slug: 'velvet-blackout-curtains', name: 'Velvet Blackout Curtains',
    shortDescription: 'Luxurious velvet blackout panels that block light and noise.',
    category: 'blackout-curtains', subCategory: 'velvet-blackout', rooms: ['living-room', 'bedroom'], collections: ['luxe-living'],
    tags: ['velvet', 'blackout', 'luxury'], colors: ['Charcoal', 'Navy', 'Blush'], sizes: ['Standard', 'Custom'], price: 3499, compareAtPrice: 4499,
    images: [IMG('blackout-velvet.jpg'), IMG('blackout-classic.jpg')], featured: true, bestseller: true,
    highlights: ['99% light blocking', 'Thermal insulation', 'Soft velvet touch'],
    specs: [{ name: 'Material', value: 'Velvet' }, { name: 'Opacity', value: 'Blackout' }, { name: 'Lining', value: 'Triple weave' }],
  },
  {
    slug: 'velvet-blue-blackout-panels', name: 'Velvet Blue Blackout Panels',
    shortDescription: 'Deep blue velvet blackout panels for a bold statement.',
    category: 'blackout-curtains', subCategory: 'velvet-blackout', rooms: ['bedroom'], collections: ['luxe-living'],
    tags: ['velvet', 'blue', 'blackout'], colors: ['Navy', 'Blue'], sizes: ['Standard'], price: 3299, compareAtPrice: 4199,
    images: [IMG('blackout-blue.jpg')], newArrival: true,
    specs: [{ name: 'Material', value: 'Velvet' }, { name: 'Opacity', value: 'Blackout' }],
  },
  {
    slug: 'classic-blackout-curtains', name: 'Classic Blackout Curtains',
    shortDescription: 'Reliable blackout curtains for everyday rooms.',
    category: 'blackout-curtains', subCategory: 'thermal-blackout', rooms: ['bedroom', 'office'], collections: ['luxe-living'],
    tags: ['blackout', 'thermal'], colors: ['Charcoal', 'Grey'], sizes: ['Standard'], price: 2799, compareAtPrice: 3599,
    images: [IMG('blackout-classic.jpg')], bestseller: true,
    specs: [{ name: 'Opacity', value: 'Blackout' }, { name: 'Insulation', value: 'Yes' }],
  },
  {
    slug: 'thermal-insulated-blackout-drapes', name: 'Thermal Insulated Blackout Drapes',
    shortDescription: 'Energy-saving thermal drapes that keep rooms cool and dark.',
    category: 'blackout-curtains', subCategory: 'thermal-blackout', rooms: ['living-room', 'office'], collections: ['luxe-living'],
    tags: ['thermal', 'insulated'], colors: ['Charcoal', 'Navy'], sizes: ['Standard', 'Custom'], price: 3199, compareAtPrice: 3999,
    images: [IMG('blackout-classic.jpg')], featured: true,
    specs: [{ name: 'Opacity', value: 'Blackout' }, { name: 'Insulation', value: 'Thermal' }],
  },
  {
    slug: 'midnight-velvet-blackout', name: 'Midnight Velvet Blackout',
    shortDescription: 'Premium midnight velvet for total darkness.',
    category: 'blackout-curtains', subCategory: 'velvet-blackout', rooms: ['bedroom'], collections: ['luxe-living'],
    tags: ['velvet', 'midnight'], colors: ['Charcoal', 'Blue'], sizes: ['Standard'], price: 3799, compareAtPrice: 4799,
    images: [IMG('blackout-velvet.jpg')], newArrival: true,
    specs: [{ name: 'Material', value: 'Heavy velvet' }, { name: 'Opacity', value: 'Blackout' }],
  },

  // ===== Roller Blinds =====
  {
    slug: 'classic-roller-blinds', name: 'Classic Roller Blinds',
    shortDescription: 'Simple, durable roller blinds with smooth operation.',
    category: 'roller-blinds', subCategory: 'standard-roller', rooms: ['kitchen', 'office'], collections: [],
    tags: ['roller', 'blinds'], colors: ['White', 'Beige'], sizes: ['Standard'], price: 1299, compareAtPrice: 1699,
    images: [IMG('roller-classic.jpg')], newArrival: true,
    specs: [{ name: 'Type', value: 'Roller' }, { name: 'Control', value: 'Chain' }],
  },
  {
    slug: 'daylight-roller-blinds', name: 'Daylight Roller Blinds',
    shortDescription: 'Light-filtering roller blinds for bright spaces.',
    category: 'roller-blinds', subCategory: 'standard-roller', rooms: ['kitchen', 'living-room'], collections: [],
    tags: ['roller', 'daylight'], colors: ['Ivory', 'Grey'], sizes: ['Standard'], price: 1499, compareAtPrice: 1899,
    images: [IMG('roller-classic.jpg')], bestseller: true,
    specs: [{ name: 'Type', value: 'Roller' }, { name: 'Opacity', value: 'Light filter' }],
  },
  {
    slug: 'blackout-roller-blinds', name: 'Blackout Roller Blinds',
    shortDescription: 'Room-darkening roller blinds for total privacy.',
    category: 'roller-blinds', subCategory: 'blackout-roller', rooms: ['office', 'bedroom'], collections: [],
    tags: ['roller', 'blackout'], colors: ['Charcoal', 'Navy'], sizes: ['Standard', 'Custom'], price: 1799, compareAtPrice: 2299,
    images: [IMG('roller-classic.jpg')], featured: true,
    specs: [{ name: 'Type', value: 'Roller' }, { name: 'Opacity', value: 'Blackout' }],
  },
  {
    slug: 'printed-roller-blinds', name: 'Printed Roller Blinds',
    shortDescription: 'Decorative printed roller blinds to add character.',
    category: 'roller-blinds', subCategory: 'standard-roller', rooms: ['kitchen'], collections: ['kitchen-charm'],
    tags: ['roller', 'printed'], colors: ['Blush', 'Sage'], sizes: ['Standard'], price: 1599, compareAtPrice: 2099,
    images: [IMG('roller-classic.jpg')],
    specs: [{ name: 'Type', value: 'Roller' }, { name: 'Pattern', value: 'Printed' }],
  },

  // ===== Wooden Blinds =====
  {
    slug: 'natural-bamboo-blinds', name: 'Natural Bamboo Blinds',
    shortDescription: 'Eco-friendly natural bamboo blinds with warm tones.',
    category: 'wooden-blinds', subCategory: 'bamboo-blinds', rooms: ['living-room', 'kitchen'], collections: ['warm-wood'],
    tags: ['bamboo', 'natural', 'eco'], colors: ['Brown', 'Beige'], sizes: ['Standard', 'Custom'], price: 2199, compareAtPrice: 2899,
    images: [IMG('wooden-bamboo.jpg'), IMG('wooden-classic.jpg')], bestseller: true, newArrival: true,
    highlights: ['100% natural bamboo', 'Eco-friendly', 'Warm natural tone'],
    specs: [{ name: 'Material', value: 'Bamboo' }, { name: 'Type', value: 'Roll-up' }],
  },
  {
    slug: 'classic-wooden-blinds', name: 'Classic Wooden Blinds',
    shortDescription: 'Timeless wooden venetian blinds for any room.',
    category: 'wooden-blinds', subCategory: 'wooden-venetian', rooms: ['living-room', 'office'], collections: ['warm-wood'],
    tags: ['wooden', 'venetian'], colors: ['Brown'], sizes: ['Standard'], price: 2599, compareAtPrice: 3299,
    images: [IMG('wooden-classic.jpg')], featured: true,
    specs: [{ name: 'Material', value: 'Wood' }, { name: 'Type', value: 'Venetian' }],
  },
  {
    slug: 'wooden-venetian-blinds', name: 'Wooden Venetian Blinds',
    shortDescription: 'Adjustable wooden venetian blinds for light control.',
    category: 'wooden-blinds', subCategory: 'wooden-venetian', rooms: ['living-room', 'bedroom'], collections: ['warm-wood'],
    tags: ['wooden', 'venetian'], colors: ['Brown', 'Beige'], sizes: ['Standard'], price: 2899, compareAtPrice: 3599,
    images: [IMG('wooden-classic.jpg')],
    specs: [{ name: 'Material', value: 'Wood' }, { name: 'Type', value: 'Venetian' }],
  },
  {
    slug: 'teak-wood-blinds', name: 'Teak Wood Blinds',
    shortDescription: 'Rich teak wood blinds for a premium natural finish.',
    category: 'wooden-blinds', subCategory: 'bamboo-blinds', rooms: ['living-room', 'office'], collections: ['warm-wood'],
    tags: ['teak', 'wooden'], colors: ['Brown'], sizes: ['Standard'], price: 3099, compareAtPrice: 3899,
    images: [IMG('wooden-bamboo.jpg')],
    specs: [{ name: 'Material', value: 'Teak wood' }, { name: 'Type', value: 'Roll-up' }],
  },
];

// ---------- Public theme + shipping settings ----------
const publicSettings = [
  {
    key: 'theme.navbar.links',
    value: [
      { title: 'Shop All', href: '/products' },
      { title: 'Curtains', href: '/category/sheer-curtains' },
      { title: 'Sofa Cover', href: '/products?q=sofa' },
      { title: 'Marbles', href: '/products?q=marble' },
      { title: 'Footwear', href: '/products?q=footwear' },
      { title: 'New Arrivals', href: '/arrivals' },
      { title: 'Best Seller', href: '/best-sellers' },
      { title: 'About Us', href: '/about' },
    ],
  },
  {
    key: 'theme.footer.links',
    value: [
      {
        title: 'Categories',
        links: [
          { name: 'Sheer Curtains', href: '/category/sheer-curtains' },
          { name: 'Blackout Curtains', href: '/category/blackout-curtains' },
          { name: 'Roller Blinds', href: '/category/roller-blinds' },
          { name: 'Wooden Blinds', href: '/category/wooden-blinds' },
        ],
      },
      {
        title: 'Policies',
        links: [
          { name: 'Exchange & Refund', href: '/pages/exchange-and-refund-policy' },
          { name: 'Privacy Policy', href: '/pages/privacy-policy' },
          { name: 'Shipping Policy', href: '/pages/shipping-policy' },
        ],
      },
    ],
  },
  {
    key: 'theme.promo.offers',
    value: [
      'Free Delivery on Orders Above \u20B91999',
      'Flat 20% Off on First Order | Use Code LOVE20',
      'Premium Custom Fitting Included on All Orders',
      'New Arrivals: Explore Our Summer Collection',
    ],
  },
  {
    key: 'theme.home.features',
    value: [
      { id: 1, icon: 'Award', title: 'Premium Quality Fabrics', description: 'High-quality fabrics with beautiful finishing and long-lasting durability.' },
      { id: 2, icon: 'Gem', title: 'Affordable Luxury', description: 'Premium-looking curtains at prices that offer great value.' },
      { id: 3, icon: 'ShoppingCart', title: 'Easy Ordering', description: 'Simple ordering process with support from selection to delivery.' },
      { id: 4, icon: 'Heart', title: 'Trusted by Customers', description: 'Real customer love, feedback and growing community.' },
    ],
  },
  {
    key: 'theme.home.testimonials',
    value: [
      { id: 1, quote: 'Exceptional quality and service. The linen curtains transformed our living room completely.', author: 'Sarah Mitchell' },
      { id: 2, quote: 'Professional installation and beautiful blackout curtains. Highly recommend!', author: 'James Peterson' },
      { id: 3, quote: 'The custom fitting service is worth every penny. Perfect measurements, perfect results.', author: 'Emma Rodriguez' },
    ],
  },
  {
    key: 'theme.home.social_feed',
    value: [
      { type: 'instagram', embedUrl: 'https://www.instagram.com/thelovesides/reel/DH_MJwGS7qE/', cover: `${API}/uploads/seed/sheer-classic.jpg` },
      { type: 'instagram', embedUrl: 'https://www.instagram.com/reel/DIOpy2yy4OV/', cover: `${API}/uploads/seed/sheer-premium-linen.jpg` },
      { type: 'instagram', embedUrl: 'https://www.instagram.com/reel/DMfYlL9IBF6/', cover: `${API}/uploads/seed/sheer-white.jpg` },
      { type: 'instagram', embedUrl: 'https://www.instagram.com/reel/DOqjgGRjLL2/', cover: `${API}/uploads/seed/blackout-blue.jpg` },
      { type: 'instagram', embedUrl: 'https://www.instagram.com/reel/DPjKm_Ekw2x/', cover: `${API}/uploads/seed/roller-classic.jpg` },
    ],
  },
  {
    key: 'theme.home.stats',
    value: [
      { id: 1, value: 15000, label: 'Happy Customers' },
      { id: 2, value: 25000, label: 'Projects Completed' },
      { id: 3, value: 12, label: 'Years of Excellence' },
    ],
  },
  {
    key: 'theme.home.hero',
    value: {
      title: 'Curtains & <br class="md:hidden" /> Quiet Luxury',
      subtitle: 'Home, Styled with Love',
      description: 'Shop our exclusive collection of premium curtains and blinds. Discover high-quality fabrics, custom sizing, and effortless style to elevate any room.',
      button1Text: 'Shop Curtains',
      button1Link: '/products',
      button2Text: 'Book Free Consultation',
      button2Link: '/contact',
      autoplay: true,
      autoplaySpeed: 4500,
      slides: [
        {
          title: 'Curtains & <br class="md:hidden" /> Quiet Luxury',
          subtitle: 'Home, Styled with Love',
          description: 'Shop our exclusive collection of premium curtains and blinds. Discover high-quality fabrics, custom sizing, and effortless style to elevate any room.',
          button1Text: 'Shop Curtains',
          button1Link: '/products',
          button2Text: 'Book Free Consultation',
          button2Link: '/contact',
          desktopImageUrl: '',
          mobileImageUrl: '',
        },
        {
          title: 'Stylish & <br class="md:hidden" /> Comfortable Sofas',
          subtitle: 'Sit Back in Style',
          description: 'Premium upholstered sofas and tailored cover sets that refresh your living room. Cosy comfort paired with elegant, durable fabrics.',
          button1Text: 'Shop Sofas',
          button1Link: '/products',
          button2Text: 'Book Free Consultation',
          button2Link: '/contact',
          desktopImageUrl: `${API}/uploads/hero/sofa-living.jpg`,
          mobileImageUrl: `${API}/uploads/hero/sofa-living.jpg`,
        },
        {
          title: 'Premium <br class="md:hidden" /> Linen Curtains',
          subtitle: 'Soft Light, Quiet Luxury',
          description: 'Floor-to-ceiling linen drapes that frame your windows with soft, flowing elegance. Breathe new life into any room with our bespoke curtains.',
          button1Text: 'Shop Curtains',
          button1Link: '/products',
          button2Text: 'Book Free Consultation',
          button2Link: '/contact',
          desktopImageUrl: `${API}/uploads/hero/curtains-linen.jpg`,
          mobileImageUrl: `${API}/uploads/hero/curtains-linen.jpg`,
        },
      ],
    },
  },
  {
    key: 'theme.home.promo_banners',
    value: [
      {
        id: '1',
        title: 'Spring Sale Event',
        description: 'Refresh your home with up to <span class="text-charcoal font-bold">40% off</span> our premium bespoke curtains.',
        buttonText: 'Shop The Sale',
        buttonLink: '/products',
        isActive: true,
      },
    ],
  },
  {
    key: 'theme.home.sections',
    value: { showFeatured: true, showBestSellers: true, bestSellersMode: 'auto' },
  },
  { key: 'theme.home.signatures', value: [] },
  {
    key: 'theme.social.links',
    value: [
      { platform: 'instagram', url: 'https://instagram.com/thelovesides' },
      { platform: 'facebook', url: 'https://facebook.com/thelovesides' },
      { platform: 'whatsapp', url: 'https://wa.me/916396762002' },
    ],
  },
  {
    key: 'theme.contact.info',
    value: {
      email: 'lykwestore12@gmail.com',
      phone: '6396762002',
      address: '12/50A Dalhai, Tajganj, Agra, Uttar Pradesh 282001',
      hours: 'Mon - Sat: 10:00 AM - 7:00 PM',
    },
  },
  { key: 'sitewideFreeShipping', value: 'true', group: 'shipping' },
  { key: 'freeShippingThreshold', value: 1999, group: 'shipping' },
  { key: 'shipping.estimatedDeliveryMin', value: 9, group: 'shipping' },
  { key: 'shipping.estimatedDeliveryMax', value: 12, group: 'shipping' },
];

async function seedStore() {
  logger.info('Connecting to database for store seeding...');
  await mongoose.connect(env.MONGO_URI);
  logger.info('Connected to MongoDB');

  try {
    // ---------- 1. Clean up old placeholder (jewellery demo) data if present ----------
    await Product.deleteMany({ slug: { $in: ['classic-diamond-ring', 'pearl-pendant-necklace'] } });
    await Collection.deleteMany({ slug: { $in: ['rings', 'necklaces'] } });

    // ---------- 2. Settings (theme + shipping) ----------
    logger.info('Seeding settings...');
    for (const s of publicSettings) {
      await Setting.findOneAndUpdate(
        { key: s.key },
        { key: s.key, value: s.value, group: (s as any).group || 'theme', isPublic: true },
        { upsert: true, new: true },
      );
    }

    // ---------- 3. Categories ----------
    logger.info('Seeding categories...');
    const categoryDocBySlug: Record<string, mongoose.Types.ObjectId> = {};
    for (const c of categories) {
      const doc = await Category.findOneAndUpdate(
        { slug: c.slug },
        { ...c, isActive: true, showInNavigation: true, deletedAt: null },
        { upsert: true, new: true },
      );
      categoryDocBySlug[c.slug] = doc._id;
    }

    // ---------- 4. SubCategories ----------
    logger.info('Seeding subcategories...');
    const subCategoryDocBySlug: Record<string, mongoose.Types.ObjectId> = {};
    for (const sc of subCategories) {
      const doc = await SubCategory.findOneAndUpdate(
        { slug: sc.slug },
        {
          name: sc.name, slug: sc.slug, image: sc.image, sortOrder: sc.sortOrder,
          categoryIds: [categoryDocBySlug[sc.category]],
          isActive: true, showInNavigation: true, deletedAt: null,
        },
        { upsert: true, new: true },
      );
      subCategoryDocBySlug[sc.slug] = doc._id;
    }

    // ---------- 5. Rooms ----------
    logger.info('Seeding rooms...');
    const roomDocBySlug: Record<string, mongoose.Types.ObjectId> = {};
    for (const r of rooms) {
      const doc = await Room.findOneAndUpdate(
        { slug: r.slug },
        { ...r, isActive: true, showInNavigation: true, deletedAt: null },
        { upsert: true, new: true },
      );
      roomDocBySlug[r.slug] = doc._id;
    }

    // ---------- 6. Collections ----------
    logger.info('Seeding collections...');
    const collectionDocBySlug: Record<string, mongoose.Types.ObjectId> = {};
    for (const col of collections) {
      const doc = await Collection.findOneAndUpdate(
        { slug: col.slug },
        { ...col, isActive: true, deletedAt: null },
        { upsert: true, new: true },
      );
      collectionDocBySlug[col.slug] = doc._id;
    }

    // ---------- 7. Products + Variants + Inventory ----------
    logger.info('Seeding products, variants and inventory...');
    const productDocBySlug: Record<string, mongoose.Types.ObjectId> = {};
    let variantCount = 0;

    for (const p of products) {
      const categoryId = categoryDocBySlug[p.category];
      const subCategoryId = subCategoryDocBySlug[p.subCategory];
      const roomIds = p.rooms.map((s) => roomDocBySlug[s]).filter(Boolean);
      const collectionIds = p.collections.map((s) => collectionDocBySlug[s]).filter(Boolean);

      const productDoc = await Product.findOneAndUpdate(
        { slug: p.slug },
        {
          name: p.name,
          slug: p.slug,
          skuPrefix: p.slug.slice(0, 6).toUpperCase(),
          shortDescription: p.shortDescription,
          description: `<p>${p.shortDescription}</p><p>Handcrafted with care by TheLoveSides. Custom sizes and premium finishing available.</p>`,
          highlights: p.highlights || ['Premium quality', 'Custom sizing available'],
          specificationTable: p.specs || [],
          categoryIds: categoryId ? [categoryId] : [],
          subCategoryIds: subCategoryId ? [subCategoryId] : [],
          roomIds,
          collectionIds,
          tags: p.tags,
          attributes: [
            { name: 'Color', values: p.colors.map(colorVal) },
            { name: 'Size', values: p.sizes },
          ],
          images: p.images,
          videos: [],
          status: 'published',
          isFeatured: !!p.featured,
          isBestSeller: !!p.bestseller,
          isNewArrival: !!p.newArrival,
          publishedAt: new Date(),
          hsnCode: '6303',
          isTaxInclusive: true,
          requiresShipping: true,
          isReturnable: true,
          returnWindowDays: 7,
          deletedAt: null,
          salesCount: p.bestseller ? 120 : p.featured ? 60 : 10,
        },
        { upsert: true, new: true },
      );
      productDocBySlug[p.slug] = productDoc._id;

      // Variants: one per colour, rotating through sizes
      for (let i = 0; i < p.colors.length; i++) {
        const color = p.colors[i];
        const size = p.sizes[i % p.sizes.length];
        const sku = makeSku(p.slug, color, size);

        const variantDoc = await ProductVariant.findOneAndUpdate(
          { sku },
          {
            productId: productDoc._id,
            sku,
            attributes: [
              { name: 'Color', value: colorVal(color) },
              { name: 'Size', value: size },
            ],
            price: p.price,
            compareAtPrice: p.compareAtPrice,
            images: p.images.slice(0, 1),
            isActive: true,
            isPurchasable: true,
            sortOrder: i,
            deletedAt: null,
          },
          { upsert: true, new: true },
        );
        variantCount++;

        await Inventory.findOneAndUpdate(
          { variantId: variantDoc._id },
          {
            variantId: variantDoc._id,
            available: 25 + i * 5,
            reserved: 0,
            lowStockThreshold: 5,
            trackInventory: true,
            allowBackorder: false,
          },
          { upsert: true, new: true },
        );
      }
    }

    // ---------- 8. Demo customer + reviews ----------
    logger.info('Seeding demo customer and reviews...');
    const demoEmail = 'demo@thelovesides.com';
    let demoUser = await User.findOne({ email: demoEmail });
    if (!demoUser) {
      demoUser = await User.create({
        email: demoEmail,
        firstName: 'Demo',
        lastName: 'Customer',
        phone: '9999999999',
        passwordHash: await hashPassword('Demo@1234'),
        isVerified: true,
      });
    }

    const reviewTargets = [
      { slug: 'velvet-blackout-curtains', rating: 5, title: 'Beautiful and truly blackout', content: 'The velvet feels luxurious and the room gets completely dark. Installation was smooth.' },
      { slug: 'premium-linen-sheer-curtains', rating: 5, title: 'Transformed my living room', content: 'Exactly the airy look I wanted. Great quality linen and perfect stitching.' },
      { slug: 'natural-bamboo-blinds', rating: 4, title: 'Lovely natural look', content: 'Warm and eco-friendly. Slight size adjustment needed but looks great.' },
      { slug: 'sheer-white-elegance-curtains', rating: 5, title: 'Crisp and elegant', content: 'Bright and clean. Perfect for my living room windows.' },
    ];
    for (const r of reviewTargets) {
      const pid = productDocBySlug[r.slug];
      if (!pid) continue;
      await Review.findOneAndUpdate(
        { productId: pid, userId: demoUser._id },
        { productId: pid, userId: demoUser._id, rating: r.rating, title: r.title, content: r.content, images: [], isVerifiedPurchase: true, status: 'approved' },
        { upsert: true, new: true },
      );
    }

    logger.info(
      `Seed complete: ${categories.length} categories, ${subCategories.length} subcategories, ` +
      `${rooms.length} rooms, ${collections.length} collections, ${products.length} products, ${variantCount} variants, reviews ${reviewTargets.length}.`,
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error seeding store data');
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedStore();
