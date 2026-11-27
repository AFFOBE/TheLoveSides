import axios from 'axios';

async function run() {
  try {
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/admin/login', {
      email: 'admin@thelovesides.com',
      password: 'Admin@123!'
    });
    const cookie = loginRes.headers['set-cookie']?.join(';');
    
    const payload = {
      name: 'Test Product With Attrs',
      slug: 'test-product-with-attrs',
      description: 'Test description',
      roomIds: [],
      collectionIds: [],
      isActive: true,
      image: '',
      images: [],
      attributes: [{ name: 'Color', values: ['Red', 'Blue'] }],
      variants: [{
        sku: 'test-product-with-attrs-01',
        price: 0,
        attributes: []
      }]
    };

    const res = await axios.post('http://localhost:4000/api/v1/admin/catalog/products', payload, {
      headers: { Cookie: cookie }
    });
    console.log('SUCCESS:', res.data);
  } catch (err: any) {
    console.error('FAILED:');
    if (err.response) {
      console.error(err.response.status, err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

run();
