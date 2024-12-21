interface OffersListProps {
    offers: any[];
    onAcceptOffer: (offerId: string) => void;
  }
  
  export const OffersList = ({ offers, onAcceptOffer }: OffersListProps) => {
    return (
      <div className="offers-list mt-4">
        <h3>Active Offers</h3>
        {offers.map((offer) => (
          <div key={offer.id} className="offer-item p-3 border rounded mb-2">
            <div>Amount: {offer.amount / 100000000} APT</div>
            <div>From: {offer.buyer}</div>
            <div>Expires: {new Date(offer.expiration * 1000).toLocaleDateString()}</div>
            <button 
              onClick={() => onAcceptOffer(offer.id)}
              className="btn btn-success btn-sm mt-2"
            >
              Accept Offer
            </button>
          </div>
        ))}
      </div>
    );
  };
  