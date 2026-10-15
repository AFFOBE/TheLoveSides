import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import { Truck } from 'lucide-react';

export default function CheckoutPage() {
  const { state, fetchCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { shipping, contactInfo } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    phone: '',
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user, isAuthenticated]);

  const [shippingRates, setShippingRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [selectedRate, setSelectedRate] = useState(null);
  const [ratesError, setRatesError] = useState('');

  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries');
        const data = await res.json();
        if (!data.error) {
          const countries = data.data.map(c => c.country).sort();
          setCountriesList(countries);
        }
      } catch (err) {
        console.error('Failed to fetch countries', err);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  // Fetch states based on selected country
  useEffect(() => {
    const fetchStates = async () => {
      if (!formData.country) return;
      setLoadingStates(true);
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: formData.country })
        });
        const data = await res.json();
        if (!data.error) {
          const uniqueStates = [];
          const seen = new Set();
          for (const s of data.data.states) {
            if (s && s.name) {
              const normalized = s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              const lower = normalized.toLowerCase();
              if (!seen.has(lower)) {
                seen.add(lower);
                uniqueStates.push(normalized);
              }
            }
          }
          setStatesList(uniqueStates.sort());
        }
      } catch (err) {
        console.error('Failed to fetch states', err);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, [formData.country]);

  // Fetch cities when state changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.state) {
        setCitiesList([]);
        return;
      }
      setLoadingCities(true);
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: formData.country, state: formData.state })
        });
        const data = await res.json();
        if (!data.error) {
          const uniqueCities = [];
          const seen = new Set();
          for (const city of data.data) {
            if (city) {
              const normalized = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              const lower = normalized.toLowerCase();
              if (!seen.has(lower)) {
                seen.add(lower);
                uniqueCities.push(normalized);
              }
            }
          }
          uniqueCities.sort();
          setCitiesList(uniqueCities);
          
          setFormData(prev => {
            if (prev.city) {
              const lowerCity = prev.city.toLowerCase();
              const fuzzyMatch = uniqueCities.find(c => {
                const cLow = c.toLowerCase();
                return cLow === lowerCity || 
                       cLow.replace('ahmad', 'ahmed') === lowerCity ||
                       cLow.replace('ahmed', 'ahmad') === lowerCity ||
                       cLow.replace('bengaluru', 'bangalore') === lowerCity ||
                       cLow.replace('bangalore', 'bengaluru') === lowerCity;
              });
              if (fuzzyMatch && fuzzyMatch !== prev.city) {
                return { ...prev, city: fuzzyMatch };
              }
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Failed to fetch cities', err);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, [formData.state]);



  // Fetch shipping rates
  useEffect(() => {
    if (formData.country !== 'India') {
      // International shipping
      setShippingRates([{
        courierId: 'international',
        courierName: 'International Standard',
        rate: 2000,
        estimatedDays: '15-20'
      }]);
      setSelectedRate({
        courierId: 'international',
        courierName: 'International Standard',
        rate: 2000,
        estimatedDays: '15-20'
      });
      setRatesError('');
      return;
    }

    if (/^\d{6}$/.test(formData.postalCode)) {
      const fetchRates = async () => {
        setLoadingRates(true);
        setRatesError('');
        try {
          // Fetch City and State from Post Office API
          try {
            const pinRes = await fetch(`https://api.postalpincode.in/pincode/${formData.postalCode}`);
            const pinData = await pinRes.json();
            if (pinData[0].Status === 'Success') {
              const postOffice = pinData[0].PostOffice[0];
              setFormData(prev => {
                let sName = postOffice.State || '';
                let cName = postOffice.District || postOffice.Block || '';
                
                if (sName.toLowerCase() === 'chattisgarh') sName = 'Chhattisgarh';
                
                const matchedState = statesList.find(s => s.toLowerCase() === sName.toLowerCase());
                if (matchedState) sName = matchedState;
                
                return {
                  ...prev,
                  city: cName,
                  state: sName
                };
              });
            }
          } catch (e) {
            console.error("Error fetching location data", e);
          }

          // In a real app, calculate total weight from cart
          const { data } = await api.get(`/shipping/rates?pincode=${formData.postalCode}&weight=0.5`);
          if (data.rates && data.rates.length > 0) {
            setShippingRates(data.rates);
            // Auto-select the cheapest rate
            const cheapest = data.rates.reduce((prev, curr) => prev.rate < curr.rate ? prev : curr);
            setSelectedRate(cheapest);
          } else {
            setShippingRates([]);
            setSelectedRate(null);
            setRatesError('No shipping rates found for this PIN code');
          }
        } catch (err) {
          setRatesError(err.response?.data?.error?.message || 'Failed to fetch shipping rates');
          setShippingRates([]);
          setSelectedRate(null);
        } finally {
          setLoadingRates(false);
        }
      };
      
      const timeoutId = setTimeout(fetchRates, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setShippingRates([]);
      setSelectedRate(null);
      setRatesError('');
    }
  }, [formData.postalCode, formData.country]);

  useEffect(() => {
    // If cart is empty, go back to home
    if (!state.loading && state.items.length === 0) {
      navigate('/');
    }
  }, [state.items, state.loading, navigate]);

  // Clear an applied coupon if the cart contents (subtotal) change
  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError('');
  }, [state.subtotal]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError('');
    try {
      const { data } = await api.post('/checkout/validate-coupon', { couponCode: code }, { withCredentials: true });
      setAppliedCoupon({
        code: data.code,
        discountAmount: data.discountAmount,
        type: data.type,
        value: data.value,
      });
      setCouponInput('');
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.response?.data?.error?.message || 'Invalid coupon code');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
    setCouponInput('');
  };

  const getWhatsAppMessage = () => {
    let itemsList = state.items.map(item => `${item.name} (Qty: ${item.quantity})`).join('\n');
    let message = `Hi, I want to place an order but my PIN code is not serviceable. Here are my details:
Name: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Phone: ${formData.phone}
Address: ${formData.addressLine1}, ${formData.addressLine2 ? formData.addressLine2 + ', ' : ''}${formData.city}, ${formData.state} - ${formData.postalCode}

Items:
${itemsList}`;

    return encodeURIComponent(message);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.phone) {
      alert("Email and phone number are required.");
      return;
    }
    
    setLoading(true);

    try {
      // 1. Create order on backend (which creates Razorpay order)
      const shippingAddress = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
        phone: formData.phone,
      };

      const { data } = await api.post('/checkout/initiate', {
        email: formData.email,
        shippingAddress,
        billingAddress: shippingAddress,
        couponCode: appliedCoupon?.code || undefined,
        shippingMethod: selectedRate ? {
          courierId: selectedRate.courierId,
          courierName: selectedRate.courierName,
          rate: finalShippingRate
        } : null
      }, { withCredentials: true });

      const { orderId, orderNumber } = data;

      // 2. Initialize Razorpay Order
      const { data: paymentData } = await api.post(`/payments/${orderId}/initiate`, {}, { withCredentials: true });
      const razorpayOrder = paymentData;

      // Ensure Razorpay script is loaded
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }

      // 3. Open Razorpay Checkout
      const options = {
        key: razorpayOrder.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mock', // Fallback for testing
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'TheLoveSides',
        description: 'Order Payment',
        order_id: razorpayOrder.id,
        handler: async function (response) {
          // 4. Verify Payment on Backend
          try {
            await api.post(`/payments/${orderId}/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }, { withCredentials: true });
            
            // Payment successful, clear cart and redirect
            fetchCart(); // This will clear the cart from state (since backend clears it)
            navigate('/order-success', {
              state: {
                paymentSuccessful: true,
                orderId,
                orderNumber,
                amount: razorpayOrder.amount,
                items: state.items,
                shippingAddress
              }
            });
          } catch (err) {
            console.error('Payment verification failed', err);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#36454F' // Charcoal color
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed', response.error);
        alert(`Payment failed: ${response.error.description}`);
      });
      rzp.open();

    } catch (error) {
      console.error('Checkout failed:', error);
      console.error('Response data:', error.response?.data);
      alert(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to initiate checkout.');
    } finally {
      setLoading(false);
    }
  };

  if (state.loading) {
    return (
      <div className="pt-32 pb-20 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-primary"></div>
      </div>
    );
  }

  const isFreeShipping = formData.country === 'India' && (shipping?.sitewideFreeShipping || (shipping?.freeShippingThreshold > 0 && state.subtotal >= shipping.freeShippingThreshold));
  const finalShippingRate = isFreeShipping ? 0 : (selectedRate?.rate || 0);

  return (
    <div className="bg-cream min-h-screen pt-32 md:pt-40 pb-16 md:pb-24">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <h1 className="font-serif text-3xl md:text-4xl text-charcoal mb-8">Checkout</h1>
        
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
          {/* Form */}
          <div className="w-full lg:w-3/5">
            <form onSubmit={handleCheckout} className="space-y-8">
              {/* Contact Info */}
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-charcoal/5 shadow-sm">
                <h2 className="font-serif text-xl text-charcoal mb-4">Contact Information</h2>
                <div>
                  <label className="block text-sm font-sans text-charcoal/80 mb-1" htmlFor="email">Email <span className="text-red-500">*</span></label>
                  <input 
                    type="email" id="email" name="email" required
                    value={formData.email} onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-sans text-charcoal/80 mb-1" htmlFor="phone">Phone (for shipping updates) <span className="text-red-500">*</span></label>
                  <input 
                    type="tel" id="phone" name="phone" required
                    value={formData.phone} onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20"
                  />
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-charcoal/5 shadow-sm">
                <h2 className="font-serif text-xl text-charcoal mb-4">Shipping Address</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-sans text-charcoal/80 mb-1" htmlFor="firstName">First Name</label>
                    <input 
                      type="text" id="firstName" name="firstName" required
                      value={formData.firstName} onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-sans text-charcoal/80 mb-1" htmlFor="lastName">Last Name</label>
                    <input 
                      type="text" id="lastName" name="lastName" required
                      value={formData.lastName} onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-sans text-charcoal/80 mb-1" htmlFor="country">Country</label>
                    <select 
                      id="country" name="country"
                      value={formData.country} onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20 bg-white"
                      disabled={loadingCountries}
                    >
                      <option value="India">India</option>
                      {countriesList.map(c => c !== 'India' && <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-sans text-charcoal/80 mb-1" htmlFor="postalCode">PIN Code</label>
                    <input 
                      type="text" id="postalCode" name="postalCode" required
                      value={formData.postalCode} onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-sans text-charcoal/80 mb-1" htmlFor="state">State</label>
                    {statesList.length > 0 ? (
                      <select 
                        id="state" name="state" required
                        value={formData.state} onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20 bg-white"
                        disabled={loadingStates}
                      >
                        <option value="">{loadingStates ? 'Loading States...' : 'Select State'}</option>
                        {statesList.map(s => <option key={s} value={s}>{s}</option>)}
                        {formData.state && !statesList.includes(formData.state) && <option value={formData.state}>{formData.state}</option>}
                      </select>
                    ) : (
                      <input 
                        type="text" id="state" name="state" required
                        value={formData.state} onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20"
                        placeholder="Enter State"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-sans text-charcoal/80 mb-1" htmlFor="city">City</label>
                    {citiesList.length > 0 ? (
                      <select 
                        id="city" name="city" required
                        value={formData.city} onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20 bg-white"
                        disabled={!formData.state || loadingCities}
                      >
                        <option value="">{loadingCities ? 'Loading Cities...' : 'Select City'}</option>
                        {citiesList.map(c => <option key={c} value={c}>{c}</option>)}
                        {formData.city && !citiesList.includes(formData.city) && <option value={formData.city}>{formData.city}</option>}
                      </select>
                    ) : (
                      <input 
                        type="text" id="city" name="city" required
                        value={formData.city} onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20"
                        placeholder="Enter City"
                      />
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-sans text-charcoal/80 mb-1" htmlFor="addressLine1">Address Line 1</label>
                    <input 
                      type="text" id="addressLine1" name="addressLine1" required
                      value={formData.addressLine1} onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-sans text-charcoal/80 mb-1" htmlFor="addressLine2">Apartment, suite, etc. (optional)</label>
                    <input 
                      type="text" id="addressLine2" name="addressLine2"
                      value={formData.addressLine2} onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Method Selection */}
              {(formData.country !== 'India' || /^\d{6}$/.test(formData.postalCode)) && (
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-charcoal/5 shadow-sm">
                  <h2 className="font-serif text-xl text-charcoal mb-4">Shipping Method</h2>
                  
                  {loadingRates ? (
                    <div className="flex items-center gap-3 text-charcoal/60 text-sm font-sans">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-primary"></div>
                      Fetching shipping rates...
                    </div>
                  ) : ratesError ? (
                    <div className="space-y-4">
                      <p className="text-sm text-red-500 font-sans">{ratesError}</p>
                      <a 
                        href={`https://wa.me/${contactInfo?.phone ? contactInfo.phone.replace(/\D/g, '') : '919738409668'}?text=${getWhatsAppMessage()}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-xl text-base shadow-sm font-medium transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        DM us on WhatsApp
                      </a>
                    </div>
                  ) : shippingRates.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRate && (
                        <div className="flex items-center justify-between p-4 rounded-xl border border-pink-primary bg-pink-primary/5 shadow-sm transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-primary/10 text-pink-primary shrink-0">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium font-sans text-charcoal text-base">Standard Delivery</p>
                              <p className="text-xs text-charcoal/60 font-sans mt-1">Estimated delivery: {shipping?.estimatedDeliveryMin || 9} - {shipping?.estimatedDeliveryMax || 10} business days</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <p className="font-semibold font-sans text-charcoal text-base">
                              {isFreeShipping ? 'Free' : `₹${selectedRate.rate}`}
                            </p>
                            <span className="text-[10px] uppercase tracking-wider text-green-600 font-semibold mt-1 bg-green-50 px-2 py-0.5 rounded-full">
                              {isFreeShipping ? 'Free Shipping' : 'Best Price'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Coupon */}
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-charcoal/5 shadow-sm">
                <h2 className="font-serif text-xl text-charcoal mb-4">Coupon</h2>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-sm font-semibold text-green-700">{appliedCoupon.code}</span>
                      <span className="font-sans text-xs text-green-600">
                        applied{appliedCoupon.type === 'percentage' ? ` (${appliedCoupon.value}% off)` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-sans text-charcoal/60 hover:text-red-500 underline transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="coupon" className="block text-sm font-sans text-charcoal/80 mb-1">Have a coupon code?</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="coupon"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        className="flex-1 min-w-0 px-4 py-3 rounded-xl border-2 border-charcoal/10 focus:outline-none focus:border-pink-primary focus:ring-4 focus:ring-pink-primary/10 font-sans text-charcoal transition-all duration-300 hover:border-charcoal/20 uppercase"
                      />
                      <Button
                        type="button"
                        variant="dark"
                        onClick={handleApplyCoupon}
                        disabled={applyingCoupon || !couponInput.trim()}
                        className="px-5 whitespace-nowrap"
                      >
                        {applyingCoupon ? 'Applying...' : 'Apply'}
                      </Button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 font-sans mt-2">{couponError}</p>}
                  </div>
                )}
              </div>

              <Button type="submit" variant="dark" className="w-full py-4 text-lg shadow-lg" disabled={loading || !selectedRate}>
                {loading ? 'Processing...' : 'Pay Now'}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-2/5">
            <div className="bg-ivory p-6 md:p-8 rounded-2xl border border-charcoal/10 sticky top-32">
              <h2 className="font-serif text-xl text-charcoal mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {state.items.map((item) => (
                  <div key={item._id} className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-white border border-charcoal/10">
                      <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif text-charcoal text-sm">{item.name}</h3>
                      <p className="font-sans text-xs text-charcoal/60 mt-1">
                        {item.attributes?.map(attr => {
                           const isColor = attr.name.toLowerCase().includes('color');
                           const displayVal = isColor ? attr.value.replace(/\s*\(#[^\)]+\)\s*/g, '') : attr.value;
                           return `${attr.name}: ${displayVal}`;
                        }).join(' | ')}
                      </p>
                      <p className="font-sans text-xs text-charcoal/60">Qty: {item.quantity}</p>
                    </div>
                    <div className="font-sans font-medium text-charcoal text-sm">
                      ₹{Number(item.price * item.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-charcoal/10 pt-4 space-y-3 font-sans text-sm">
                <div className="flex justify-between text-charcoal/80">
                  <span>Subtotal</span>
                  <span>₹{Number(state.subtotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-charcoal/80">
                  <span>Shipping</span>
                  <span>{selectedRate ? (isFreeShipping ? 'Free' : `₹${selectedRate.rate}`) : 'Calculated at next step'}</span>
                </div>
                <div className="flex justify-between text-charcoal/80">
                  <span>Taxes (included)</span>
                  <span>₹0</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-₹{Number(appliedCoupon.discountAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-charcoal/10 mt-4 pt-4 flex justify-between font-serif text-xl text-charcoal">
                <span>Total</span>
                <span>₹{Number(Math.max(0, state.subtotal - (appliedCoupon?.discountAmount || 0) + finalShippingRate)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
