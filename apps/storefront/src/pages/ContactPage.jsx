import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';

export default function ContactPage() {
  const { contactInfo } = useTheme();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');
    
    try {
      await api.post('/contact', formData);
      setStatus('success');
    } catch (error) {
      console.error('Failed to submit message:', error);
      setStatus('error');
      setErrorMessage(error.response?.data?.message || 'Failed to send message. Please try again later.');
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-cream">
      {/* Hero Section */}
      <section className="pt-32 md:pt-40 pb-16 bg-ivory border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-charcoal mb-6">Get In Touch</h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            We'd love to hear from you. Whether you have a question about our products, need styling advice, or want to track an order.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Contact Information */}
            <div className="space-y-12">
              <div>
                <h2 className="text-3xl font-serif text-charcoal mb-4">Let's Connect</h2>
                <div className="w-16 h-1 bg-pink-primary mb-6"></div>
                <p className="text-gray-600 text-lg leading-relaxed mb-8">
                  Our customer service team is available to assist you with any inquiries. Reach out to us through any of the channels below, and we'll get back to you as soon as possible.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-pink-50 text-pink-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-charcoal mb-1">Email Us</h3>
                    <p className="text-gray-500 mb-1">For general queries:</p>
                    <a href={`mailto:${contactInfo?.email || 'hello@thelovesides.com'}`} className="text-pink-dark hover:underline font-medium">
                      {contactInfo?.email || 'hello@thelovesides.com'}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-pink-50 text-pink-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-charcoal mb-1">Call Us</h3>
                    <p className="text-gray-500 mb-1">Mon-Fri from 9am to 6pm:</p>
                    <a href={`tel:${contactInfo?.phone || '+1 (234) 567-890'}`} className="text-pink-dark hover:underline font-medium">
                      {contactInfo?.phone || '+1 (234) 567-890'}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-pink-50 text-pink-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-charcoal mb-1">Our Studio</h3>
                    <p className="text-gray-500 whitespace-pre-line">
                      {contactInfo?.address || '123 Design Avenue,\nCreative District, NY 10001\nUnited States'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-pink-50 text-pink-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-charcoal mb-1">Hours</h3>
                    <p className="text-gray-500 whitespace-pre-line">
                      {contactInfo?.hours || 'Monday - Friday: 9am - 6pm\nSaturday: 10am - 4pm\nSunday: Closed'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-gray-100">
              {status === 'success' ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-serif text-charcoal mb-4">Message Sent!</h3>
                  <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                    Thank you for reaching out. We've received your message and our team will get back to you within 24 hours.
                  </p>
                  <button 
                    onClick={() => { setStatus('idle'); setFormData({ name: '', email: '', phone: '', subject: '', message: '' }); }}
                    className="px-6 py-3 bg-gray-100 text-charcoal font-medium rounded-full hover:bg-gray-200 transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-serif text-charcoal mb-6">Send a Message</h3>
                  {status === 'error' && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                      {errorMessage}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-gray-700">Your Name *</label>
                        <input
                          type="text"
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-colors"
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-gray-700">Your Email *</label>
                        <input
                          type="email"
                          id="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-colors"
                          placeholder="jane@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium text-gray-700">Mobile Number *</label>
                        <input
                          type="tel"
                          id="phone"
                          required
                          inputMode="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-colors"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="subject" className="text-sm font-medium text-gray-700">Subject</label>
                        <input
                          type="text"
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => setFormData({...formData, subject: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-colors"
                          placeholder="How can we help?"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium text-gray-700">Message *</label>
                      <textarea
                        id="message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-colors resize-y"
                        placeholder="Tell us everything..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="w-full flex items-center justify-center gap-2 bg-pink-primary text-white px-8 py-4 rounded-full hover:bg-pink-dark transition-colors font-medium text-lg shadow-md shadow-pink-primary/20 disabled:opacity-70"
                    >
                      {status === 'submitting' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {status === 'submitting' ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
