import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '../src/models/Product.js'; // Adjust depending on model path
import dotenv from 'dotenv';

dotenv.config();

const uploadDir = path.join(process.cwd(), 'public', 'uploads');
const optimizedDir = path.join(process.cwd(), 'public', 'uploads', 'optimized');

if (!fs.existsSync(optimizedDir)) {
  fs.mkdirSync(optimizedDir, { recursive: true });
}

async function reoptimizeImages() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thelovesides');
  console.log('Connected.');

  const files = fs.readdirSync(uploadDir);
  let processed = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(uploadDir, file);
    if (fs.statSync(filePath).isDirectory()) continue;

    // Skip if it is already following our scalable convention
    if (file.endsWith('-large.webp') || file.endsWith('-medium.webp') || file.endsWith('-thumbnail.webp')) {
      skipped++;
      continue;
    }

    try {
      const baseId = uuidv4();
      const largeFilename = `${baseId}-large.webp`;
      const mediumFilename = `${baseId}-medium.webp`;
      const thumbFilename = `${baseId}-thumbnail.webp`;
      
      const largePath = path.join(optimizedDir, largeFilename);
      const mediumPath = path.join(optimizedDir, mediumFilename);
      const thumbPath = path.join(optimizedDir, thumbFilename);

      console.log(`Optimizing ${file}...`);
      
      // Large
      await sharp(filePath)
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75, effort: 6 })
        .toFile(largePath);

      // Medium
      await sharp(filePath)
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75, effort: 6 })
        .toFile(mediumPath);

      // Thumbnail
      await sharp(filePath)
        .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70, effort: 6 })
        .toFile(thumbPath);

      // Replace old URL with the large URL in the DB
      const oldUrl = `/uploads/${file}`;
      const newUrl = `/uploads/optimized/${largeFilename}`;
      
      const products = await Product.find({ images: oldUrl });
      
      for (const p of products) {
        p.images = p.images.map(img => img === oldUrl ? newUrl : img);
        await p.save();
        console.log(`Updated product ${p._id} with new scalable image URL.`);
      }

      processed++;
    } catch (err) {
      console.error(`Failed to process ${file}:`, err);
    }
  }

  console.log(`Finished! Processed: ${processed}, Skipped: ${skipped}`);
  process.exit(0);
}

reoptimizeImages();
