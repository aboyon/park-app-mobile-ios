import { API_BASE_URL, apiHeaders } from '@/constants/config';

export type TopupResult = {
  success:       boolean;
  balance_cents: number;
  balance:       number;
  purchase: {
    id:           string;
    amount_cents: number;
    amount:       number;
    currency:     string;
    status:       string;
    created_at:   string;
  };
};

export async function topupWallet(params: {
  token:             string;
  amount_cents:      number;
  card_token:        string;
  payment_method_id: string;
}): Promise<TopupResult> {
  const response = await fetch(`${API_BASE_URL}/api/wallet/topup`, {
    method:  'POST',
    headers: apiHeaders(params.token),
    body:    JSON.stringify({
      amount_cents:      params.amount_cents,
      card_token:        params.card_token,
      payment_method_id: params.payment_method_id,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Error al recargar la billetera');
  }

  return data as TopupResult;
}
