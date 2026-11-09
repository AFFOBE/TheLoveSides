import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { sendOrderConfirmationEmail } from '../src/services/invoice.service.js';

const orderId = process.argv[2];
const email = process.argv[3] || 'admin@thelovesides.com';

async function main() {
  if (!orderId) {
    console.error('Usage: npx tsx scripts/test-confirm-email.ts <orderId> [email]');
    process.exit(1);
  }
  await mongoose.connect(env.MONGO_URI);
  const start = Date.now();
  await sendOrderConfirmationEmail(orderId, email);
  console.log(`sendOrderConfirmationEmail finished in ${Date.now() - start}ms`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
