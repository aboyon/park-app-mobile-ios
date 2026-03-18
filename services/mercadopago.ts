import { MP_PUBLIC_KEY } from '@/constants/config';

type TokenizeCardParams = {
  cardNumber: string;
  securityCode: string;
  expirationMonth: string;
  expirationYear: string;
  cardholderName: string;
};

type TokenizeCardResult = {
  token: string;
  payment_method_id: string;
};

export async function tokenizeCard(params: TokenizeCardParams): Promise<TokenizeCardResult> {
  const response = await fetch(
    `https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_number:      params.cardNumber,
        security_code:    params.securityCode,
        expiration_month: params.expirationMonth,
        expiration_year:  params.expirationYear,
        cardholder: { name: params.cardholderName },
      }),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message ?? 'Card tokenization failed');
  }

  const data = await response.json();
  return {
    token: data.id as string,
    payment_method_id: data.payment_method_id as string,
  };
}