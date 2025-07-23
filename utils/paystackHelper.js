const axios = require('axios');

exports.createSubaccountOnPaystack = async ({ business_name, settlement_bank, account_number, percentage_charge }) => {
  const response = await axios.post(
    'https://api.paystack.co/subaccount',
    {
      business_name,
      settlement_bank,
      account_number,
      percentage_charge,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.data;
};
