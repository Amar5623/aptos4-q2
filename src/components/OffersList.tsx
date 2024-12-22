import { Button } from 'antd';

interface Offer {
  offerId: string;
  amount: string;
  expiration: string;
}

export const OffersList = ({ offers, onAcceptOffer }: { 
  offers: Offer[], 
  onAcceptOffer: (offerId: string) => void 
}) => {
  console.log('OffersList - Rendering with offers:', offers);
  const formatDate = (timestamp: string) => {
    console.log('OffersList - Formatting timestamp:', {
      raw: timestamp,
      parsed: parseInt(timestamp),
      date: new Date(parseInt(timestamp) * 1000).toLocaleString()
    });
    const timestampNumber = parseInt(timestamp);
    if (isNaN(timestampNumber)) return '';
    return new Date(timestampNumber * 1000).toLocaleString();
  };

  const formatAmount = (amountStr: string) => {
    console.log('OffersList - Formatting amount:', {
      raw: amountStr,
      parsed: parseInt(amountStr),
      formatted: (parseInt(amountStr) / 100000000).toFixed(2)
    });
    const amount = parseInt(amountStr);
    if (isNaN(amount)) return '0';
    return (amount / 100000000).toFixed(2);
  };

  return (
    <div className="offers-list">
      {offers.map((offer) => (
        <div key={offer.offerId} style={{
          padding: "15px",
          border: "1px solid #e8e8e8",
          borderRadius: "8px",
          marginBottom: "15px",
          backgroundColor: "#fafafa"
        }}>
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
            Offer #{offer.offerId}
          </div>
          <div style={{ color: "#1890ff", marginBottom: "5px" }}>
            Amount: {formatAmount(offer.amount)} APT
          </div>
          <div style={{ color: "#666", fontSize: "14px", marginBottom: "10px" }}>
            Expires: {formatDate(offer.expiration)}
          </div>
          <Button 
            type="primary"
            onClick={() => onAcceptOffer(offer.offerId)}
            style={{ width: "100%" }}
          >
            Accept Offer
          </Button>
        </div>
      ))}
    </div>
  );
};
