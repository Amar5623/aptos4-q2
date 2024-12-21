import React from 'react';
import { Card, Button } from 'antd';

const { Meta } = Card;

interface NFT {
  id: number;
  name: string;
  description: string;
  uri: string;
  highest_bid: number;
  auction_end: number;
  is_auction: boolean;
}

interface AuctionCardProps {
  nft: NFT;
  onPlaceBid: (nft: NFT) => void;
}

const isAuctionActive = (auctionEnd: number) => {
  return Date.now() / 1000 < auctionEnd;
};

const AuctionCard: React.FC<AuctionCardProps> = ({ nft, onPlaceBid }) => {
  return (
    <Card
      hoverable
      style={{
        width: '100%',
        maxWidth: '240px',
        margin: '0 auto',
      }}
      cover={<img alt={nft.name} src={nft.uri} />}
      actions={[
        isAuctionActive(nft.auction_end) ? (
          <Button type="link" onClick={() => onPlaceBid(nft)}>
            Place Bid ({(nft.highest_bid / 100000000) + 0.1} APT)
          </Button>
        ) : (
          <Button type="link" disabled>
            Auction Ended
          </Button>
        )
      ]}
    >
      <Meta 
        title={nft.name} 
        description={`Current Bid: ${nft.highest_bid / 100000000} APT`} 
      />
      <p>{nft.description}</p>
      <p>Ends: {new Date(nft.auction_end * 1000).toLocaleString()}</p>
    </Card>
  );
};

export default AuctionCard;
