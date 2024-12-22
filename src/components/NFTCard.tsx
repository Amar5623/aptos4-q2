import React from 'react';
import { Card, Button, Tag } from 'antd';
import { type NFT } from '../pages/MarketView'; // Import the NFT type

const { Meta } = Card;

// Import these from MarketView or create a separate constants file
const rarityColors: { [key: number]: string } = {
  1: "green",
  2: "blue",
  3: "purple",
  4: "orange",
};

const rarityLabels: { [key: number]: string } = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Super Rare",
};

const truncateAddress = (address: string, start = 6, end = 4) => {
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

interface NFTCardProps {
  nft: NFT;
  onBuyClick: (nft: NFT) => void;
  onBidClick: (nft: NFT) => void;
  onOfferClick: (nft: NFT) => void;
}
  
const NFTCard: React.FC<NFTCardProps> = ({ nft, onBuyClick, onBidClick, onOfferClick }) => {
    return (
      <Card
        hoverable
        style={{
          width: "100%",
          maxWidth: "240px",
          margin: "0 auto",
        }}
        cover={<img alt={nft.name} src={nft.uri} />}
        actions={[
          nft.is_auction ? (
            <Button type="link" onClick={() => onBidClick(nft)}>
              Place Bid
            </Button>
          ) : (
            <Button type="link" onClick={() => onBuyClick(nft)}>
              Buy
            </Button>
          ),
          <Button type="link" onClick={() => onOfferClick(nft)}>
            Make Offer
          </Button>
        ]}
      >
        <Tag
          color={rarityColors[nft.rarity]}
          style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}
        >
          {rarityLabels[nft.rarity]}
        </Tag>
        <Meta 
          title={nft.name} 
          description={nft.is_auction ? 
            `Current Bid: ${nft.highest_bid / 100000000} APT` : 
            `Price: ${nft.price} APT`
          } 
        />
        <p>{nft.description}</p>
        <p>ID: {nft.id}</p>
        <p>Owner: {truncateAddress(nft.owner)}</p>
      </Card>
    );
  };

export default NFTCard;
  