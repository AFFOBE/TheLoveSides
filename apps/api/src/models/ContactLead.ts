import mongoose, { Document, Schema } from 'mongoose';

export interface IContactLead extends Document {
  name: string;
  email: string;
  phone: string;
  subject?: string;
  message: string;
  status: 'unread' | 'read';
  createdAt: Date;
  updatedAt: Date;
}

const contactLeadSchema = new Schema<IContactLead>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    subject: { type: String, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['unread', 'read'], default: 'unread' },
  },
  { timestamps: true }
);

export const ContactLead = mongoose.model<IContactLead>('ContactLead', contactLeadSchema);
