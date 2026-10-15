import mongoose, { Document, Schema } from 'mongoose';

export interface INewsletterSubscriber extends Document {
  email: string;
  status: 'active' | 'unsubscribed';
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    status: { type: String, enum: ['active', 'unsubscribed'], default: 'active' },
    source: { type: String, trim: true, default: 'footer' },
  },
  { timestamps: true }
);

export const NewsletterSubscriber = mongoose.model<INewsletterSubscriber>(
  'NewsletterSubscriber',
  newsletterSubscriberSchema
);
