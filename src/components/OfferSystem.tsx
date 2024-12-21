import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface OfferSystemProps {
  nftId: number;
  currentPrice: number;
  onOfferSubmit: (amount: number, expiration: number) => void;
}

export const OfferSystem = ({ nftId, currentPrice, onOfferSubmit }: OfferSystemProps) => {
  const [offerAmount, setOfferAmount] = useState('');
  const [expirationDays, setExpirationDays] = useState('7');
  const { account } = useWallet();

  const handleSubmit = () => {
    const amount = parseFloat(offerAmount);
    const expiration = parseInt(expirationDays) * 24 * 60 * 60; // Convert days to seconds
    onOfferSubmit(amount, expiration);
  };

  return (
    <div className="offer-system p-4 border rounded">
      <h3>Make an Offer</h3>
      <div className="mb-3">
        <label>Offer Amount (APT)</label>
        <input
          type="number"
          value={offerAmount}
          onChange={(e) => setOfferAmount(e.target.value)}
          className="form-control"
        />
      </div>
      <div className="mb-3">
        <label>Expires in (days)</label>
        <input
          type="number"
          value={expirationDays}
          onChange={(e) => setExpirationDays(e.target.value)}
          className="form-control"
        />
      </div>
      <button 
        onClick={handleSubmit}
        className="btn btn-primary"
        disabled={!account}
      >
        Submit Offer
      </button>
    </div>
  );
};
