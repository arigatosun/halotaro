import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { customerEmail, paymentMethodId } = req.body;

if (!customerEmail || !paymentMethodId) {
  return res.status(400).json({ error: 'Invalid parameters' });
}

// stripe_customersテーブルを更新
const { error } = await supabase
  .from('stripe_customers')
  .update({ payment_method_id: paymentMethodId })
  .eq('customer_email', customerEmail);

    if (error) {
      throw error;
    }

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error saving payment method:', err);
    res.status(500).json({ error: err.message });
  }
}
