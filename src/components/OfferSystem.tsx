import { useState } from 'react';
import { Input, Button, Form } from 'antd';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface OfferSystemProps {
  nftId: number;
  currentPrice: number;
  onOfferSubmit: (amount: number, expiration: number) => Promise<void>;
}

export const OfferSystem = ({ nftId, currentPrice, onOfferSubmit }: OfferSystemProps) => {
  const [offerAmount, setOfferAmount] = useState('');
  const [expirationDays, setExpirationDays] = useState('7');
  const { account } = useWallet();

  const handleSubmit = async () => {
    if (!offerAmount || !expirationDays) return;

    console.log('OfferSystem - Submitting offer:', {
      amount: offerAmount,
      expirationDays,
      amountInOctas: Math.floor(parseFloat(offerAmount) * 100000000),
      expirationTimestamp: Math.floor(Date.now() / 1000) + (parseInt(expirationDays) * 24 * 60 * 60)
    });
    
    const amountInOctas = Math.floor(parseFloat(offerAmount) * 100000000);
    const expirationTimestamp = Math.floor(Date.now() / 1000) + (parseInt(expirationDays) * 24 * 60 * 60);
    
    await onOfferSubmit(amountInOctas, expirationTimestamp);
  };

  return (
    <Form layout="vertical">
      <Form.Item label="Offer Amount (APT)">
        <Input
          type="number"
          value={offerAmount}
          onChange={(e) => setOfferAmount(e.target.value)}
          min="0"
          step="0.1"
        />
      </Form.Item>
      <Form.Item label="Expires in (days)">
        <Input
          type="number"
          value={expirationDays}
          onChange={(e) => setExpirationDays(e.target.value)}
          min="1"
        />
      </Form.Item>
      <Button
        type="primary"
        onClick={handleSubmit}
        disabled={!account || !offerAmount}
        block
      >
        Submit Offer
      </Button>
    </Form>
  );
};
