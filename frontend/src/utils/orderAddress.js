const readFirst = (source = {}, keys = []) => {
  if (!source || typeof source !== 'object') {
    return '';
  }

  for (const key of keys) {
    const value = source[key];
    if (value == null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized) {
      return normalized;
    }
  }

  return '';
};

const joinName = (...parts) => parts
  .map((part) => String(part || '').trim())
  .filter(Boolean)
  .join(' ')
  .trim();

const normalizeAddressSource = (source = {}) => {
  if (!source || typeof source !== 'object') {
    return {};
  }

  return {
    name: readFirst(source, ['name', 'fullName', 'full_name', 'customerName', 'customer_name'])
      || joinName(
        readFirst(source, ['firstName', 'first_name', 'firstname']),
        readFirst(source, ['lastName', 'last_name', 'lastname'])
      ),
    email: readFirst(source, ['email', 'customerEmail', 'customer_email']),
    phone: readFirst(source, [
      'phone',
      'phoneNumber',
      'phone_number',
      'mobile',
      'mobileNumber',
      'mobile_number',
      'contact',
      'contactNumber',
      'contact_number',
      'customerPhone',
      'customer_phone',
    ]),
    address: readFirst(source, [
      'address',
      'street',
      'address1',
      'address_1',
      'addressLine1',
      'address_line1',
      'line1',
      'line_1',
    ]),
    address2: readFirst(source, [
      'address2',
      'address_2',
      'addressLine2',
      'address_line2',
      'line2',
      'line_2',
      'landmark',
      'apartment',
    ]),
    city: readFirst(source, ['city', 'town']),
    state: readFirst(source, ['state', 'province', 'region']),
    pincode: readFirst(source, [
      'pincode',
      'pinCode',
      'pin_code',
      'postcode',
      'postCode',
      'postalCode',
      'postal_code',
      'zipCode',
      'zip_code',
      'zip',
    ]),
    country: readFirst(source, ['country', 'countryCode', 'country_code']),
  };
};

export const getOrderIdentifier = (order = {}) => (
  order?._id
  || order?.id
  || order?.orderMongoId
  || order?.order_mongo_id
  || order?.orderId
  || order?.order_id
  || ''
);

export const normalizeOrderAddress = (order = {}) => {
  const sources = [
    order?.shippingAddress,
    order?.shipping_address,
    order?.address,
    order?.billingAddress,
    order?.billing_address,
    {
      name: order?.userName || order?.customerName || order?.customer_name,
      email: order?.userEmail || order?.customerEmail || order?.customer_email,
      phone: order?.userPhone || order?.customerPhone || order?.customer_phone,
      address: order?.shipping_address_1 || order?.address_1 || order?.address_line1,
      address2: order?.shipping_address_2 || order?.address_2 || order?.address_line2,
      city: order?.shipping_city || order?.city,
      state: order?.shipping_state || order?.state,
      pincode: order?.shipping_postcode || order?.shipping_pincode || order?.postcode || order?.pincode,
      country: order?.shipping_country || order?.country,
    },
  ];

  const normalized = sources.reduce((address, source) => {
    const candidate = normalizeAddressSource(source);
    Object.entries(candidate).forEach(([key, value]) => {
      if (!address[key] && value) {
        address[key] = value;
      }
    });
    return address;
  }, {});

  return {
    name: normalized.name || order?.userName || order?.userId?.name || '',
    email: normalized.email || order?.userEmail || order?.userId?.email || '',
    phone: normalized.phone || order?.userPhone || order?.userId?.phone || '',
    address: normalized.address || '',
    address2: normalized.address2 || '',
    city: normalized.city || '',
    state: normalized.state || '',
    pincode: normalized.pincode || '',
    country: normalized.country || 'India',
  };
};
