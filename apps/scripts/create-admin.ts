import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';
import { hashPassword } from '../src/utils/password.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { Role } from '../src/models/Role.js';

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    logger.error('ADMIN_EMAIL and ADMIN_PASSWORD must be provided in the environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(env.MONGO_URI);
    
    let superAdminRole = await Role.findOne({ name: 'Super Admin' });
    if (!superAdminRole) {
      logger.error('Super Admin role not found. Please run the seed script first.');
      process.exit(1);
    }

    const existing = await AdminUser.findOne({ email });
    if (existing) {
      logger.info(`Admin user ${email} already exists.`);
      process.exit(0);
    }

    const passwordHash = await hashPassword(password);
    await AdminUser.create({
      email,
      passwordHash,
      firstName: 'New',
      lastName: 'Admin',
      role: superAdminRole._id,
    });

    logger.info(`Admin user created: ${email}`);
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Failed to create admin user');
    process.exit(1);
  }
}

run();
