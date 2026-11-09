import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Check, Heart, Plane, Image as ImageIcon } from 'lucide-react';

export default function AboutPage() {
  // Admin yahan apni image ka link daal sakta hai. 
  const [founderImage, setFounderImage] = useState(""); 

  return (
    <div className="flex flex-col w-full min-h-screen bg-white font-sans text-gray-800">
      
      {/* 1. HERO / FOUNDER INTRO SECTION */}
      {/* pt-24 aur pb-16 diya hai taaki navbar se door rahe */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Left Text */}
          <div className="w-full lg:w-1/2 space-y-6">
            <p className="text-pink-500 tracking-[0.2em] text-sm font-semibold uppercase">
              About The Love Sides
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#5c1f3d] leading-tight">
              Homes are meant to be <span className="text-pink-500 italic font-medium">personal</span>, not perfect.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-lg pt-2">
              We make curtains and home décor that are cultivated with care and shaped by you, so every room feels unmistakably yours.
            </p>
          </div>

          {/* Right Image/Shape Section */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end relative mt-8 lg:mt-0">
            
            {/* Box ko chota kiya: max-h-[450px] aur height fix ki hai taaki navbar se na takraye */}
            <div className="relative w-full max-w-[320px] md:max-w-[360px] h-[400px] md:h-[450px] rounded-t-[10rem] rounded-b-[2rem] overflow-hidden bg-[#fdf2f6] flex items-center justify-center shadow-sm border border-pink-50">
              
              {/* AGAR IMAGE HAI TOH DIKHEGI, NAHI TOH TEXT DIKHEGA */}
              {founderImage ? (
                <img 
                  src={founderImage} 
                  alt="Founder Midaal Thakur" 
                  className="absolute inset-0 w-full h-full object-cover z-0" 
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-pink-300 z-0 px-6 text-center space-y-3">
                  <ImageIcon className="w-8 h-8 opacity-50" />
                  <p className="text-sm font-medium text-pink-400/80">Add Founder's Image Here</p>
                </div>
              )}

              {/* Founder Name Badge - Bottom Center */}
              <div className="absolute bottom-6 z-10 bg-[#e95f92] text-white px-6 py-2 rounded-full text-sm font-medium shadow-md whitespace-nowrap">
                Midaal Thakur · Founder
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OUR STORY SECTION */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-gray-100">
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="w-full lg:w-5/12 space-y-6">
            <p className="text-pink-500 tracking-[0.2em] text-sm font-semibold uppercase">
              Our Story
            </p>
            <h2 className="text-4xl md:text-5xl font-serif text-[#5c1f3d] leading-tight">
              A small-town girl with a big dream
            </h2>
            <div className="border-l-4 border-pink-400 pl-6 my-8 py-1">
              <p className="text-xl text-gray-700 italic font-serif">
                “Every home deserves a little love.”
              </p>
            </div>
          </div>
          <div className="w-full lg:w-7/12 space-y-6 text-gray-600 text-lg leading-relaxed">
            <p>
              Midaal grew up in a business family, watching her father build a business of his own. So when she decided to start one herself, she looked for a product that people truly needed and built around it.
            </p>
            <p>
              She noticed that curtains are something every home needs, yet they were often treated as an afterthought. She started there, and the response was real. People came, trusted us, and came back again.
            </p>
            <p>
              What started with curtains has grown into a brand that styles whole rooms, with sofa covers, marbles, placemats, footwear and more, and there is more to come. The idea has not changed since day one: a home should feel warm, personal and loved.
            </p>
          </div>
        </div>
      </section>

      {/* 3. STATS BAR */}
      <section className="bg-[#ea80ac] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          <div>
            <h3 className="text-3xl md:text-4xl font-serif mb-2">25,000+</h3>
            <p className="text-sm text-white/90">Happy customers</p>
          </div>
          <div>
            <h3 className="text-3xl md:text-4xl font-serif mb-2">10+</h3>
            <p className="text-sm text-white/90">Quality checks on every piece</p>
          </div>
          <div>
            <h3 className="text-3xl md:text-4xl font-serif mb-2">Worldwide</h3>
            <p className="text-sm text-white/90">Delivered all over the world</p>
          </div>
          <div>
            <h3 className="text-3xl md:text-4xl font-serif mb-2">Made for you</h3>
            <p className="text-sm text-white/90">Stitched to your specifications</p>
          </div>
        </div>
      </section>

      {/* 4. WHY THE LOVE SIDES (Custom Made Cards) */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <p className="text-pink-500 tracking-[0.2em] text-sm font-semibold uppercase">
            Why The Love Sides
          </p>
          <h2 className="text-4xl md:text-5xl font-serif text-[#5c1f3d]">
            Made with care, made for you
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Most of our orders now come from customers who have shopped with us before, and that trust means everything to us.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Scissors, title: "Custom-made", desc: "Choose your size, fabric and style. We make it to your specifications, not to a standard size." },
            { icon: Check, title: "Carefully stitched", desc: "Every piece goes through more than ten quality checks before it is packed and sent to you." },
            { icon: Heart, title: "Customers who return", desc: "Our customers come back again and again, and that is the best review we could ask for." },
            { icon: Plane, title: "Delivered worldwide", desc: "From our workshop to homes all over the world, wherever you are, we will get it to you." }
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-8 rounded-3xl border border-pink-100 shadow-[0_4px_20px_-4px_rgba(234,128,172,0.1)] hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mb-6">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif text-[#5c1f3d] font-semibold mb-3">{item.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FABRICS & CATEGORIES (Two Cards) */}
      <section className="bg-pink-50/50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fabrics Card */}
          <div className="bg-white p-10 md:p-12 rounded-[2rem] border border-pink-100">
            <h3 className="text-2xl font-serif text-[#5c1f3d] font-semibold mb-4">Fabrics we love</h3>
            <p className="text-gray-600 mb-8">
              Soft and sheer, or rich and heavy. Pick the feel that suits your light, your room and your mood.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Georgette", "Pure Cotton", "Silk", "Net", "and more"].map((tag, i) => (
                <span key={i} className="px-5 py-2 rounded-full bg-pink-50 text-pink-600 text-sm font-medium border border-pink-100/50">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Corners Card */}
          <div className="bg-white p-10 md:p-12 rounded-[2rem] border border-pink-100">
            <h3 className="text-2xl font-serif text-[#5c1f3d] font-semibold mb-4">For every corner of your home</h3>
            <p className="text-gray-600 mb-8">
              Curtains are where we began, and they stay close to our heart. Alongside them, we are building a home you can style from room to room.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Curtains", "Sofa Covers", "Marbles", "Placemats", "Footwear", "and more"].map((tag, i) => (
                <span key={i} className="px-5 py-2 rounded-full bg-pink-50 text-pink-600 text-sm font-medium border border-pink-100/50">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. A NOTE FROM OUR FOUNDER */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center space-y-8">
        <p className="text-pink-500 tracking-[0.2em] text-sm font-semibold uppercase">
          A Note From Our Founder
        </p>
        <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
          <p>
            I never set out to build a big brand. I just wanted to start something of my own, and I looked for something every home needs. Curtains were that for me.
          </p>
          <p>
            What I am proudest of is not the numbers. It is the customers who come back, order after order, and tell us that a room finally started to feel like theirs.
          </p>
          <p>
            Every piece we send out carries a little bit of me and my team. We make it carefully, and we hope it makes your home feel the way it should: like you.
          </p>
        </div>
        <p className="text-pink-500 font-serif italic text-xl pt-4">
          With love, Midaal
        </p>
      </section>

      {/* 7. FINAL CTA BANNER */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-5xl mx-auto bg-pink-50/80 rounded-[2.5rem] p-12 md:p-20 text-center border border-pink-100">
          <h2 className="text-4xl md:text-5xl font-serif text-[#5c1f3d] mb-6">
            Let's make your home feel like you
          </h2>
          <p className="text-gray-600 text-lg mb-10 max-w-2xl mx-auto">
            Browse our collections, or message us if you need help choosing the right fabric, size or style.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/products" className="px-8 py-4 rounded-full bg-[#e91e63] text-white font-medium hover:bg-pink-600 transition-colors shadow-lg shadow-pink-500/30">
              Explore the Collection
            </Link>
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-full bg-white text-[#e91e63] border border-pink-200 font-medium hover:bg-pink-50 transition-colors">
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}