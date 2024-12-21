import React, { useState, useEffect } from "react";
import { Typography, Radio, message, Card, Row, Col, Pagination, Tag, Button, Modal, Input } from "antd";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import AuctionCard from '../components/AuctionCard';
import { formatDistance } from 'date-fns';

const { Title } = Typography;
const { Meta } = Card;

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

type NFT = {
  id: number;
  owner: string;
  name: string;
  description: string;
  uri: string;
  price: number;
  for_sale: boolean;
  rarity: number;
  is_auction: boolean;
  auction_end: number;
  highest_bid: number;
  highest_bidder: string;
  starting_bid: number;
};

interface MarketViewProps {
  marketplaceAddr: string;
}

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

const MarketView: React.FC<MarketViewProps> = ({ marketplaceAddr }) => {
  const { signAndSubmitTransaction } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [rarity, setRarity] = useState<'all' | number>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [isBidModalVisible, setIsBidModalVisible] = useState(false);

  useEffect(() => {
    handleFetchNfts(undefined);
  }, []);

  useEffect(() => {
    const checkAndEndExpiredAuctions = async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        for (const nft of nfts) {
            if (nft.is_auction && nft.auction_end < currentTime) {
                await handleEndAuction(nft);
            }
        }
    };

    const interval = setInterval(checkAndEndExpiredAuctions, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
}, [nfts]);


  const handleFetchNfts = async (selectedRarity: number | undefined) => {
    try {
        const response = await client.getAccountResource(
            marketplaceAddr,
            "0xa256fddba13780914e70b6f74cf24af7548e796ad8dcbf331c85c93327f99ec4::NFTMarketplace::Marketplace"
        );
        const nftList = (response.data as { nfts: NFT[] }).nfts;

        const hexToUint8Array = (hexString: string): Uint8Array => {
            const bytes = new Uint8Array(hexString.length / 2);
            for (let i = 0; i < hexString.length; i += 2) {
                bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
            }
            return bytes;
        };

        const decodedNfts = nftList.map((nft) => ({
            ...nft,
            name: new TextDecoder().decode(hexToUint8Array(nft.name.slice(2))),
            description: new TextDecoder().decode(hexToUint8Array(nft.description.slice(2))),
            uri: new TextDecoder().decode(hexToUint8Array(nft.uri.slice(2))),
            price: nft.price /100000000 ,
            highest_bid: nft.highest_bid
        }));

        // Filter NFTs based on `for_sale` property and rarity if selected
        const filteredNfts = decodedNfts.filter((nft) => 
          (nft.for_sale || (nft.is_auction && isAuctionActive(nft.auction_end))) && 
          (selectedRarity === undefined || nft.rarity === selectedRarity)
        );

        setNfts(filteredNfts);
        setCurrentPage(1);
    } catch (error) {
        console.error("Error fetching NFTs by rarity:", error);
        message.error("Failed to fetch NFTs.");
    }
};

  const handleBuyClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsBuyModalVisible(true);
  };

  const handleCancelBuy = () => {
    setIsBuyModalVisible(false);
    setSelectedNft(null);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedNft) return;
  
    try {
      const priceInOctas = selectedNft.price * 100000000;
  
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::purchase_nft`,
        type_arguments: [],
        arguments: [marketplaceAddr, selectedNft.id.toString(), priceInOctas.toString()],
      };
  
      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);
  
      message.success("NFT purchased successfully!");
      setIsBuyModalVisible(false);
      handleFetchNfts(rarity === 'all' ? undefined : rarity); // Refresh NFT list
      console.log("signAndSubmitTransaction:", signAndSubmitTransaction);
    } catch (error) {
      console.error("Error purchasing NFT:", error);
      message.error("Failed to purchase NFT.");
    }
  };

  const handlePlaceBid = async (nft: NFT, bidAmount: number) => {
    if (!isAuctionActive(nft.auction_end)) {
      message.error("Auction has ended");
      return;
    }
  
    // Convert current highest bid from Octas to APT for comparison
    const currentHighestBid = nft.highest_bid / 100000000;
    const minimumBidRequired = currentHighestBid + 0.1;
  
    if (bidAmount < minimumBidRequired) {
      message.error(`Bid must be at least ${minimumBidRequired} APT`);
      return;
    }
  
    try {
      const bidInOctas = Math.floor(bidAmount * 100000000).toString();
      
      const payload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::place_bid`,
        type_arguments: [],
        arguments: [marketplaceAddr, nft.id.toString(), bidInOctas],
      };
  
      const response = await (window as any).aptos.signAndSubmitTransaction(payload);
      await client.waitForTransaction(response.hash);
      message.success("Bid placed successfully!");
      setIsBidModalVisible(false);
      handleFetchNfts(rarity === 'all' ? undefined : rarity);
    } catch (error) {
      console.error("Error placing bid:", error);
      message.error("Failed to place bid.");
    }
  };

  const isAuctionActive = (auctionEnd: number) => {
    return Date.now() / 1000 < auctionEnd;
  };

  const handleBidClick = (nft: NFT) => {
    console.log("NFT Data:", {
      starting_bid: nft.starting_bid,
      highest_bid: nft.highest_bid,
      raw_nft: nft
    });
    setSelectedNft(nft);
    setBidAmount((nft.highest_bid / 100000000 + 0.1).toString());
    setIsBidModalVisible(true);
  };
  

  const handleEndAuction = async (nft: NFT) => {
    try {
        const payload = {
            type: "entry_function_payload",
            function: `${marketplaceAddr}::NFTMarketplace::end_auction`,
            type_arguments: [],
            arguments: [marketplaceAddr, nft.id.toString()],
        };

        const response = await (window as any).aptos.signAndSubmitTransaction(payload);
        await client.waitForTransaction(response.hash);
        message.success("Auction ended successfully!");
        handleFetchNfts(rarity === 'all' ? undefined : rarity);  // Pass the current rarity filter
    } catch (error) {
        console.error("Error ending auction:", error);
        message.error("Failed to end auction.");
    }
};

  

  const paginatedNfts = nfts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div
      style={{  
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Title level={2} style={{ marginBottom: "20px" }}>Marketplace</Title>
  
      {/* Filter Buttons */}
      <div style={{ marginBottom: "20px" }}>
        <Radio.Group
          value={rarity}
          onChange={(e) => {
            const selectedRarity = e.target.value;
            setRarity(selectedRarity);
            handleFetchNfts(selectedRarity === 'all' ? undefined : selectedRarity);
          }}
          buttonStyle="solid"
        >
          <Radio.Button value="all">All</Radio.Button>
          <Radio.Button value={1}>Common</Radio.Button>
          <Radio.Button value={2}>Uncommon</Radio.Button>
          <Radio.Button value={3}>Rare</Radio.Button>
          <Radio.Button value={4}>Super Rare</Radio.Button>
        </Radio.Group>
      </div>
  
      {/* Card Grid */}
      <Row
        gutter={[24, 24]}
        style={{
          marginTop: 20,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {paginatedNfts.map((nft) => (
          <Col
            key={nft.id}
            xs={24} sm={12} md={8} lg={6} xl={6}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {nft.is_auction ? (
              <AuctionCard 
              nft={nft} 
              onPlaceBid={() => handleBidClick(nft)} 
              />
            ) : (
              <Card
                hoverable
                style={{
                  width: "100%",
                  maxWidth: "240px",
                  margin: "0 auto",
                }}
                cover={<img alt={nft.name} src={nft.uri} />}
                actions={[
                  <Button type="link" onClick={() => handleBuyClick(nft)}>
                    Buy
                  </Button>
                ]}
              >
                <Tag
                  color={rarityColors[nft.rarity]}
                  style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}
                >
                  {rarityLabels[nft.rarity]}
                </Tag>

                <Meta title={nft.name} description={`Price: ${nft.price} APT`} />
                <p>{nft.description}</p>
                <p>ID: {nft.id}</p>
                <p>Owner: {truncateAddress(nft.owner)}</p>
              </Card>
            )}
          </Col>
        ))}
      </Row>
  
      {/* Pagination */}
      <div style={{ marginTop: 30, marginBottom: 30 }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={nfts.length}
          onChange={(page) => setCurrentPage(page)}
          style={{ display: "flex", justifyContent: "center" }}
        />
      </div>
  
      {/* Buy Modal */}
      <Modal
        title="Purchase NFT"
        visible={isBuyModalVisible}
        onCancel={handleCancelBuy}
        footer={[
          <Button key="cancel" onClick={handleCancelBuy}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmPurchase}>
            Confirm Purchase
          </Button>,
        ]}
      >
        {selectedNft && (
          <>
            <p><strong>NFT ID:</strong> {selectedNft.id}</p>
            <p><strong>Name:</strong> {selectedNft.name}</p>
            <p><strong>Description:</strong> {selectedNft.description}</p>
            <p><strong>Rarity:</strong> {rarityLabels[selectedNft.rarity]}</p>
            <p><strong>Price:</strong> {selectedNft.price} APT</p>
            <p><strong>Owner:</strong> {truncateAddress(selectedNft.owner)}</p>
          </>
        )}
      </Modal>

  
      <Modal
        title="Place Bid"
        visible={isBidModalVisible}
        onCancel={() => setIsBidModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsBidModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => {
              handlePlaceBid(selectedNft!, parseFloat(bidAmount));
            }}
          >
            Place Bid
          </Button>
        ]}
      >
        {selectedNft && (
          <>
            <p><strong>Current Highest Bid:</strong> {selectedNft.highest_bid / 100000000} APT</p>
            <p><strong>Starting Bid:</strong> {selectedNft.price} APT</p>
            <p><strong>Minimum Next Bid:</strong> {Math.max(selectedNft.price / 100000000, (selectedNft.highest_bid / 100000000) + 0.1)} APT</p>
            <Input
              type="number"
              step="0.1"
              min={Math.max(selectedNft.price / 100000000, (selectedNft.highest_bid / 100000000) + 0.1)}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Enter bid amount in APT"
            />
          </>
        )}
      </Modal>


    </div>
  );
};

export default MarketView;