import PDFDocument from 'pdfkit';
import { Order } from '../models/Order.js';
import { emailService } from './email.service.js';
import { logger } from '../utils/logger.js';

export async function generateInvoicePDF(orderId: string): Promise<Buffer> {
  const order = await Order.findById(orderId).lean();
  if (!order) {
    throw new Error('Order not found');
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Exact Theme Colors from Storefront
      const charcoal = '#1F2937';
      const pinkPrimary = '#FE7DBD';
      const grayLight = '#F3F4F6';

      // --- Luxury Brand Header ---
      // Brand Name in Serif
      doc.font('Times-Roman').fontSize(32).fillColor(charcoal).text('TheLoveSides', 50, 60, { align: 'center' });
      doc.moveDown(0.2);
      
      // Minimal contact info
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280')
        .text('www.thelovesides.com  |  contact@thelovesides.com', { align: 'center' });
      
      doc.moveDown(2);
      
      // Thin elegant divider
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(grayLight).lineWidth(1).stroke();
      doc.moveDown(2);

      // --- Order Metadata ---
      const metaY = doc.y;
      
      // Invoice Title
      doc.font('Times-Roman').fontSize(16).fillColor(charcoal).text('ORDER INVOICE', 50, metaY);
      
      doc.font('Helvetica').fontSize(10).fillColor(charcoal)
        .text(`Order No: #${order.orderNumber}`, 50, metaY + 25)
        .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, metaY + 40);

      // Status Badge
      doc.font('Helvetica-Bold').fontSize(10).fillColor(pinkPrimary)
        .text(order.status.replace(/_/g, ' '), 50, metaY + 55);

      // Addresses (Aligned Right)
      doc.font('Times-Bold').fontSize(10).fillColor(charcoal).text('BILLED TO', 350, metaY, { align: 'right' });
      doc.font('Helvetica').fontSize(9).fillColor('#4B5563')
        .text(order.billingAddress?.fullName || order.shippingAddress.fullName, 350, metaY + 15, { align: 'right' })
        .text(order.billingAddress?.addressLine1 || order.shippingAddress.addressLine1, 350, metaY + 28, { align: 'right' })
        .text(`${order.billingAddress?.city || order.shippingAddress.city}, ${order.billingAddress?.state || order.shippingAddress.state} ${order.billingAddress?.pincode || order.shippingAddress.pincode}`, 350, metaY + 41, { align: 'right' })
        .text(order.billingAddress?.country || order.shippingAddress.country, 350, metaY + 54, { align: 'right' });

      doc.moveDown(4);

      // --- Minimalist Item Table ---
      const tableTop = doc.y + 10;
      
      // Table Header
      doc.font('Times-Bold').fontSize(10).fillColor(charcoal);
      doc.text('ITEM', 50, tableTop);
      doc.text('QTY', 350, tableTop, { width: 40, align: 'center' });
      doc.text('TOTAL', 460, tableTop, { width: 85, align: 'right' });

      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor(grayLight).stroke();

      // Table Rows
      doc.font('Helvetica').fontSize(10).fillColor(charcoal);
      let currentY = tableTop + 25;

      order.items.forEach((item) => {
        doc.text(item.name, 50, currentY, { width: 280, lineBreak: false });
        doc.text(item.quantity.toString(), 350, currentY, { width: 40, align: 'center' });
        doc.text(`Rs. ${(item.price * item.quantity).toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
        currentY += 25;
      });

      doc.moveTo(50, currentY + 5).lineTo(545, currentY + 5).strokeColor(grayLight).stroke();
      currentY += 25;

      // --- Summary Section ---
      doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
      
      doc.text('Subtotal', 350, currentY, { width: 70, align: 'right' });
      doc.text(`Rs. ${order.subtotal?.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
      currentY += 20;

      if (order.discountAmount > 0) {
        doc.fillColor(pinkPrimary).text('Discount', 350, currentY, { width: 70, align: 'right' });
        doc.text(`-Rs. ${order.discountAmount.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
        doc.fillColor('#4B5563');
        currentY += 20;
      }

      doc.text('Shipping', 350, currentY, { width: 70, align: 'right' });
      doc.text(order.shippingAmount > 0 ? `Rs. ${order.shippingAmount.toFixed(2)}` : 'Free', 460, currentY, { width: 85, align: 'right' });
      currentY += 20;

      doc.text('Tax', 350, currentY, { width: 70, align: 'right' });
      doc.text(`Rs. ${order.taxAmount?.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
      currentY += 20;

      // Grand Total
      doc.moveTo(350, currentY).lineTo(545, currentY).strokeColor(grayLight).stroke();
      currentY += 10;
      
      doc.font('Times-Bold').fontSize(14).fillColor(charcoal);
      doc.text('TOTAL', 350, currentY, { width: 70, align: 'right' });
      doc.text(`Rs. ${order.grandTotal?.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });

      // --- Footer ---
      const bottomY = doc.page.height - 100;
      doc.font('Times-Italic').fontSize(12).fillColor('#6B7280')
         .text('Thank you for your love.', 50, bottomY, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendOrderConfirmationEmail(orderId: string, email: string, maxAttempts = 3) {
  let html: string;
  let subject: string;
  let text: string;

  try {
    const order = await Order.findById(orderId).lean();
    if (!order) {
      logger.error({ orderId }, 'Cannot send order confirmation: order not found');
      return;
    }

    const itemsHtml = (order.items || [])
      .map(
        (item) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(item.name)} &times; ${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">&#8377;${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
      )
      .join('');

    subject = `Order Confirmation ${order.orderNumber} - TheLoveSides`;
    text = `Thank you for your order! Order Number: ${order.orderNumber}. Grand Total: Rs. ${order.grandTotal}. Your invoice is attached as a PDF.`;
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #d81b60;">Thank you for your order, ${escapeHtml(order.shippingAddress.fullName)}!</h2>
        <p>We've received your order and are getting it ready for shipment.</p>
        <p style="margin-top:16px;"><strong>Order Number:</strong> ${escapeHtml(order.orderNumber)}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#f7f7f7;">
              <th style="padding:8px 12px;text-align:left;">Item</th>
              <th style="padding:8px 12px;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td style="padding:10px 12px;font-weight:bold;border-top:2px solid #333;">Grand Total</td>
              <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #333;">&#8377;${order.grandTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <p>Your detailed invoice is attached as a PDF. You can view live order status anytime under "My Orders" on our website.</p>
        <br/>
        <p>Best Regards,</p>
        <p><strong>TheLoveSides Team</strong></p>
      </div>
    `;
  } catch (error) {
    logger.error({ err: error, orderId }, 'Failed to build order confirmation email');
    return;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const pdfBuffer = await generateInvoicePDF(orderId);

      await emailService.sendEmail({
        to: email,
        subject,
        text,
        html,
        attachments: [{
          filename: `Invoice.pdf`,
          content: pdfBuffer,
        }],
      });
      logger.info({ orderId, email, attempt }, 'Order confirmation email with invoice sent');
      return;
    } catch (error) {
      logger.error({ err: error, orderId, attempt, maxAttempts }, 'Order confirmation email attempt failed');
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }

  logger.error({ orderId, email, maxAttempts }, 'Order confirmation email failed after all attempts');
}
