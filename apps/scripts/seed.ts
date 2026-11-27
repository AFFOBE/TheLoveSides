import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';
import { hashPassword } from '../src/utils/password.js';

// Models
import { Role, ALL_PERMISSIONS } from '../src/models/Role.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { CmsPage } from '../src/models/CmsPage.js';
import { Collection } from '../src/models/Collection.js';
import { Product } from '../src/models/Product.js';
import { ProductVariant } from '../src/models/ProductVariant.js';
import { Inventory } from '../src/models/Inventory.js';

async function seedDatabase() {
  logger.info('Connecting to database for seeding...');
  await mongoose.connect(env.MONGO_URI);
  logger.info('Connected to MongoDB');

  try {
    // 1. Roles
    logger.info('Seeding roles...');
    const superAdminRole = await Role.findOneAndUpdate(
      { name: 'Super Admin' },
      {
        name: 'Super Admin',
        description: 'Full system access',
        permissions: ALL_PERMISSIONS,
        isSystem: true,
      },
      { new: true, upsert: true }
    );

    await Role.findOneAndUpdate(
      { name: 'Store Manager' },
      {
        name: 'Store Manager',
        description: 'Manage products, orders, and customers',
        permissions: [
          'products.read', 'products.create', 'products.update',
          'orders.read', 'orders.update',
          'customers.read', 'customers.update',
          'categories.read', 'categories.create', 'categories.update'
        ],
        isSystem: true,
      },
      { new: true, upsert: true }
    );

    // 2. Superadmin User
    logger.info('Seeding superadmin user...');
    const adminEmail = 'admin@thelovesides.com';
    const adminExists = await AdminUser.findOne({ email: adminEmail });
    if (!adminExists) {
      const passwordHash = await hashPassword('Admin@123!');
      await AdminUser.create({
        email: adminEmail,
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        role: superAdminRole._id,
      });
      logger.info(`Superadmin created: ${adminEmail} (password: Admin@123!)`);
    } else {
      logger.info('Superadmin already exists. Skipping.');
    }

    // 3. CMS Pages
    logger.info('Seeding CMS pages...');
    const pages = [
      { title: 'About Us', slug: 'about-us', type: 'page', content: '<h2>About TheLoveSides</h2><p>Welcome to our premium e-commerce store.</p>' },
      { title: 'Terms of Service', slug: 'terms-of-service', type: 'legal', content: '<h2>Terms of Service</h2><p>By using this site, you agree to these terms.</p>' },
      { title: 'Privacy Policy', slug: 'privacy-policy', type: 'legal', content: `<h2>Privacy Policy</h2>
<p><strong>Last Updated:</strong> August 31, 2026</p>
<p>At thelovesides, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your information when you visit or make a purchase from our website.</p>
<h3>1. Information We Collect</h3>
<p>When you visit our website, place an order, or contact us, we may collect the following information:</p>
<ul>
  <li>Full name</li>
  <li>Mobile/phone number</li>
  <li>Email address</li>
  <li>Billing and shipping address</li>
  <li>Payment and transaction details</li>
  <li>Order and purchase information</li>
  <li>Information you provide when contacting our customer support</li>
  <li>Website usage information, such as cookies and browsing activity</li>
</ul>
<p>We only collect information that is reasonably required to provide our services and process your orders.</p>
<h3>2. How We Use Your Information</h3>
<p>We may use the information collected to:</p>
<ul>
  <li>Process and deliver your orders</li>
  <li>Confirm and manage your purchases</li>
  <li>Communicate with you regarding your order</li>
  <li>Provide customer support</li>
  <li>Process payments and refunds, where applicable</li>
  <li>Improve our products, services, and website</li>
  <li>Prevent fraudulent or unauthorized transactions</li>
  <li>Send promotional offers, updates, or marketing communications where permitted</li>
  <li>Comply with applicable legal and regulatory requirements</li>
</ul>
<h3>3. Payment Information</h3>
<p>Payments made through our website may be processed through secure third-party payment gateways.</p>
<p>thelovesides does not intentionally store your complete debit card, credit card, UPI, or banking credentials on its own servers. Payment information is handled by the respective payment service provider according to its privacy and security practices.</p>
<h3>4. Sharing of Information</h3>
<p>We do not sell or rent your personal information to third parties.</p>
<p>We may share necessary information with trusted service providers, such as:</p>
<ul>
  <li>Payment gateway providers</li>
  <li>Courier and shipping partners</li>
  <li>Website and hosting service providers</li>
  <li>Technology, analytics, or customer-support service providers</li>
  <li>Government authorities or legal bodies when required by law</li>
</ul>
<p>Such information is shared only when reasonably necessary to provide our services or meet legal obligations.</p>
<h3>5. Cookies</h3>
<p>Our website may use cookies and similar technologies to improve your browsing experience, remember your preferences, understand website traffic, and improve our services.</p>
<p>You may choose to disable cookies through your browser settings. However, disabling certain cookies may affect some website features.</p>
<h3>6. Data Security</h3>
<p>We take reasonable technical and organizational measures to protect your personal information against unauthorized access, misuse, alteration, disclosure, or destruction.</p>
<p>However, no method of transmission or electronic storage is completely secure, and we cannot guarantee absolute security of your information.</p>
<h3>7. Data Retention</h3>
<p>We retain your personal information only for as long as reasonably necessary to provide our services, complete transactions, maintain business and accounting records, resolve disputes, prevent fraud, and comply with applicable laws.</p>
<h3>8. Your Rights</h3>
<p>Depending on applicable law, you may have the right to:</p>
<ul>
  <li>Request access to the personal information we hold about you</li>
  <li>Request correction of inaccurate information</li>
  <li>Request deletion of your personal information, where legally permitted</li>
  <li>Withdraw consent for certain communications</li>
  <li>Ask questions about how your information is being used</li>
</ul>
<p>To make a privacy-related request, you can contact us using the details provided below.</p>
<h3>9. Marketing Communications</h3>
<p>If you have provided your consent or otherwise permitted us to contact you, we may send you information about new products, offers, promotions, or other updates from thelovesides.</p>
<p>You may opt out of promotional communications at any time by contacting us or using the unsubscribe option where provided.</p>
<h3>10. Third-Party Links</h3>
<p>Our website may contain links to third-party websites or services. We are not responsible for the privacy practices, content, or security of those third-party websites.</p>
<p>We recommend reviewing their respective Privacy Policies before providing any personal information.</p>
<h3>11. Children’s Privacy</h3>
<p>Our website is not intended to knowingly collect personal information from children. If we become aware that personal information has been provided by a child without appropriate consent, we will take reasonable steps to address the situation.</p>
<h3>12. Changes to This Privacy Policy</h3>
<p>We may update this Privacy Policy from time to time to reflect changes in our services, business practices, or applicable laws.</p>
<p>Any updated version will be posted on this page with the revised “Last Updated” date.</p>
<h3>13. Contact Us</h3>
<p>If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact us:</p>
<p><strong>Brand:</strong> thelovesides<br>
<strong>Email:</strong> lykwestore12@gmail.com<br>
<strong>Phone/WhatsApp:</strong> 6396762002<br>
<strong>Address:</strong> 12/50A dalhai tajganj Agra 282001</p>
<p>By using our website, you acknowledge that you have read and understood this Privacy Policy.</p>` },
      { title: 'Exchange & Refund Policy', slug: 'exchange-and-refund-policy', type: 'legal', content: `<h2>Exchange & Refund Policy – The Love Sides</h2>
<p>At The Love Sides, we take great care in preparing and delivering your orders. Please read our Exchange & Refund Policy carefully before placing your order.</p>
<h3>1. Exchange Policy</h3>
<p>We offer a 7-day exchange policy, which means you have 7 days from the date of receiving your order to request an exchange.</p>
<p>We only accept the exchange:</p>
<ul>
  <li>If the item is defective, damaged or if you receive the wrong item, so that we can evaluate the issue and make it right.</li>
  <li>You place order for wrong size.</li>
</ul>
<p>We exchange with same product. You can’t change the style.</p>
<h4>Non-Exchangeable Situations</h4>
<p>Exchange requests will not be accepted in the following cases:</p>
<ul>
  <li>If we received different product.</li>
  <li>Missing item</li>
  <li>Stain product</li>
  <li>Used product</li>
</ul>
<p>Please carefully check the product details, size, colour and other specifications before placing your order.</p>
<h3>2. Cancellation Policy</h3>
<p>If an order is placed by mistake, a cancellation request can be made within 24 hours of placing the order.</p>
<p>Once the order has been processed, no cancellation or refund will be possible, and the customer will be required to accept the order.</p>
<h3>3. How to Request an Exchange</h3>
<p>To request an exchange, please contact us within 3 days of receiving your order through our official customer support/contact channel.</p>
<p>Please provide your order number along with clear photographs/videos of the product, if required.</p>
<p><strong>Important:</strong> Products sent back without informing and receiving confirmation from The Love Sides beforehand will not be accepted.</p>
<h3>4. Exchange Shipping Charges</h3>
<p>The customer will be responsible for the courier charges for when customer want to change the size.</p>
<p>Thelovesides borrow the shipping charges when you received wrong product, defected product.</p>
<p>Please note that product will need to be sent to the following address:</p>
<p><strong>Name</strong> — Arti thakur<br>
<strong>Address with pincode</strong> — 12/50A dalhai tajganj Agra 282001 (Near madan mohan mandir)<br>
<strong>Active contact no</strong> — 6396762002<br>
<strong>Email</strong> — lykwestore12@gmail.com</p>
<ul>
  <li>Sending the product back to The Love Sides.</li>
  <li>Shipping the exchanged product to the customer.</li>
</ul>
<p>Exchange requests will only be processed after the returned product is received and inspected by our team.</p>
<h3>5. Damaged, Defective or Wrong Product</h3>
<p>Please inspect your order immediately upon delivery.</p>
<p>If you receive a damaged, defective or incorrect product, please contact us as soon as possible with clear photographs/videos of the product and its packaging.</p>
<p>After verification, if the issue is confirmed to be from our end, we will provide an appropriate resolution, which may include an exchange or store credit.</p>
<h3>6. Refund Policy</h3>
<p>The Love Sides does not offer refunds, except in cases where the issue is confirmed to be from our end.</p>
<p>In cases where a refund would otherwise be applicable, the resolution will generally be provided as Store Credit, which can be used toward your next purchase from The Love Sides.</p>
<h3>7. Contact Us</h3>
<p>For any questions regarding our Exchange & Refund Policy, please contact our customer support team through our official contact details provided on our website.</p>
<p><strong>The Love Sides</strong><br>
Made with love for your beautiful spaces.</p>` },
      { title: 'Shipping Policy', slug: 'shipping-policy', type: 'legal', content: `<h2>SHIPPING POLICY — thelovesides</h2>
<p><strong>Last Updated:</strong> August 31, 2026</p>
<p>At thelovesides, most of our products are made with care and prepared according to the order. Because of this, processing and dispatch may take some time. We request you to read the following shipping terms before placing your order.</p>
<h3>1. ORDER PROCESSING & DISPATCH</h3>
<ul>
  <li>Our products are carefully prepared and packed after receiving the order.</li>
  <li>Orders are generally dispatched within 10–25 business days from the date of order confirmation.</li>
  <li>Processing time may vary depending on the product, customization, order volume, or unforeseen circumstances.</li>
  <li>Once your order has been dispatched, you will receive the shipment/tracking details on the email address or mobile number provided at the time of placing the order.</li>
</ul>
<h3>2. DELIVERY TIME</h3>
<ul>
  <li>After dispatch, the delivery time depends on the courier/shipping partner and the destination.</li>
  <li>Estimated delivery timelines may vary due to weather conditions, public holidays, remote locations, courier delays, or other circumstances beyond our control.</li>
  <li>Once the parcel has been handed over to the courier, thelovesides is not responsible for delays caused by the shipping partner.</li>
</ul>
<h3>3. COURIER DELAYS & RTO</h3>
<ul>
  <li>Customers are requested to provide a complete and accurate shipping address and contact details while placing the order.</li>
  <li>If a parcel is returned to origin (RTO) because of an incorrect address, incomplete address, customer unavailability, refusal to accept the parcel, or repeated failed delivery attempts, the order may be reshipped after applicable additional shipping charges are paid by the customer.</li>
  <li>If the RTO or delivery issue is determined to have occurred due to a courier/service-related error, thelovesides may arrange a re-shipment without additional shipping charges, subject to verification.</li>
  <li>No refund will be issued solely because a parcel has been returned due to customer-related delivery issues.</li>
</ul>
<h3>4. CHANGE OF DELIVERY ADDRESS</h3>
<ul>
  <li>If you need to change your delivery address, please contact us as soon as possible after placing the order.</li>
  <li>Address changes can generally be accommodated only before the order has been dispatched.</li>
  <li>Once the shipment has been handed over to the courier, we may not be able to modify the delivery address.</li>
</ul>
<h3>5. TRACKING INFORMATION</h3>
<p>After dispatch, tracking details will be shared through the contact information provided by you.</p>
<p>Customers can use the tracking information to check the latest shipment status directly through the respective courier service.</p>
<p>Please allow some time for the tracking information to become active after dispatch.</p>
<h3>6. DELIVERY ATTEMPTS</h3>
<p>Customers are requested to remain available at the provided delivery address and respond to calls/messages from the courier partner when required.</p>
<p>If the courier makes multiple unsuccessful delivery attempts and the parcel is subsequently returned to us, additional shipping charges may apply for re-dispatch.</p>
<h3>7. DAMAGED PACKAGE</h3>
<p>If your package appears visibly damaged at the time of delivery, we recommend that you record an unboxing video and contact us immediately with photographs/videos of the package and product.</p>
<p>This will help us investigate the issue with the shipping partner and assist you appropriately.</p>
<h3>8. SHIPPING SUPPORT</h3>
<p>For any questions regarding your shipment, tracking, or delivery, please contact our customer support team.</p>
<p><strong>Email:</strong> lykwestore12@gmail.com<br>
<strong>WhatsApp/Phone:</strong> 6396762002</p>
<p>thelovesides reserves the right to update or modify this Shipping Policy whenever required. Any changes will be published on this page.</p>` }
    ];

    for (const page of pages) {
      await CmsPage.findOneAndUpdate(
        { slug: page.slug },
        { ...page, status: 'published' },
        { upsert: true }
      );
    }

    // 4. Collections & Placeholder Products
    logger.info('Seeding collections and products...');
    
    // Collection 1: Rings
    const ringsCol = await Collection.findOneAndUpdate(
      { slug: 'rings' },
      { name: 'Rings', slug: 'rings', description: 'Beautiful handcrafted rings.', isActive: true, sortOrder: 1 },
      { new: true, upsert: true }
    );

    // Collection 2: Necklaces
    const necklacesCol = await Collection.findOneAndUpdate(
      { slug: 'necklaces' },
      { name: 'Necklaces', slug: 'necklaces', description: 'Elegant necklaces for every occasion.', isActive: true, sortOrder: 2 },
      { new: true, upsert: true }
    );

    // Seed a product if none exist
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      const product1 = await Product.create({
        name: 'Classic Diamond Ring',
        slug: 'classic-diamond-ring',
        description: 'A timeless classic diamond ring made with 18k white gold.',
        collectionIds: [ringsCol._id],
        isActive: true,
        status: 'published',
        attributes: [
          { name: 'Material', values: ['18k White Gold'] },
          { name: 'Size', values: ['7'] }
        ]
      });

      const variant1 = await ProductVariant.create({
        productId: product1._id,
        sku: 'RNG-DIA-01-WHT',
        price: 50000,
        attributes: [
          { name: 'Material', value: '18k White Gold' },
          { name: 'Size', value: '7' }
        ],
      });

      await Inventory.create({
        variantId: variant1._id,
        available: 10,
        reserved: 0,
      });

      const product2 = await Product.create({
        name: 'Pearl Pendant Necklace',
        slug: 'pearl-pendant-necklace',
        description: 'A beautiful freshwater pearl pendant on a silver chain.',
        collectionIds: [necklacesCol._id],
        isActive: true,
        status: 'published',
        attributes: [
          { name: 'Material', values: ['Sterling Silver'] }
        ]
      });

      const variant2 = await ProductVariant.create({
        productId: product2._id,
        sku: 'NCK-PRL-01-SLV',
        price: 15000,
        attributes: [
          { name: 'Material', value: 'Sterling Silver' }
        ],
      });

      await Inventory.create({
        variantId: variant2._id,
        available: 25,
        reserved: 0,
      });

      logger.info('Products seeded successfully.');
    } else {
      logger.info('Products already exist. Skipping.');
    }

    logger.info('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error seeding database');
    process.exit(1);
  }
}

seedDatabase();
