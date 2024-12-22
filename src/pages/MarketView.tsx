import React, { useState, useEffect } from "react";
import { Typography, Radio, message, Card, Row, Col, Pagination, Tag, Button, Modal, Input, Slider, Select } from "antd";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import AuctionCard from '../components/AuctionCard';
import { OfferSystem } from '../components/OfferSystem';
import { type MyNFTsRef } from './MyNFTs';
import NFTCard from '../components/NFTCard';


const { Title } = Typography;
const { Meta } = Card;

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

export type NFT = {
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
  const myNFTsRef = React.useRef<MyNFTsRef>(null);
  const pageSize = 8;

  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [isBidModalVisible, setIsBidModalVisible] = useState(false);

  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5]);
  const [dateRange, setDateRange] = useState<[number, number]>([0, Date.now()]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all"); // all, auction, buyNow
  const [showFilters, setShowFilters] = useState(false);


  const handleFetchNfts = React.useCallback(async (selectedRarity: number | undefined, forceRefresh: boolean = false) => {
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
        // const filteredNfts = decodedNfts.filter((nft) => 
        //   (nft.for_sale || (nft.is_auction && isAuctionActive(nft.auction_end))) && 
        //   (selectedRarity === undefined || nft.rarity === selectedRarity)
        // );

        let filteredNfts = decodedNfts.filter((nft) => {
          const forSaleOrActiveAuction = nft.for_sale || (nft.is_auction && isAuctionActive(nft.auction_end));
          const meetsRarityFilter = selectedRarity === undefined || nft.rarity === selectedRarity;
          const meetsPriceFilter = nft.is_auction ? 
            (nft.highest_bid / 100000000) >= priceRange[0] && (nft.highest_bid / 100000000) <= priceRange[1] :
            nft.price >= priceRange[0] && nft.price <= priceRange[1];
          const meetsSearchFilter = searchQuery === "" || 
            nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            nft.id.toString().includes(searchQuery);
          const meetsStatusFilter = filterStatus === "all" || 
            (filterStatus === "auction" && nft.is_auction) ||
            (filterStatus === "buyNow" && !nft.is_auction);
    
          return forSaleOrActiveAuction && meetsRarityFilter && 
                 meetsPriceFilter && meetsSearchFilter && meetsStatusFilter;
        });

      // Apply sorting
      filteredNfts.sort((a, b) => {
          switch (sortBy) {
              case "priceHigh":
                  return b.price - a.price;
              case "priceLow":
                  return a.price - b.price;
              case "oldest":
                  return a.id - b.id;
              case "newest":
              default:
                  return b.id - a.id;
          }
      });

      setNfts(filteredNfts);
      setCurrentPage(1);
  } catch (error) {
      console.error("Error fetching NFTs:", error);
      message.error("Failed to fetch NFTs.");
  }
}, [priceRange, filterStatus, sortBy, searchQuery]);


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
  

  const handleEndAuction = React.useCallback(async (nftId: number) => {
    try {
        const payload = {
            type: "entry_function_payload",
            function: `${marketplaceAddr}::NFTMarketplace::end_auction`,
            type_arguments: [],
            arguments: [marketplaceAddr, nftId.toString()]
        };

        const response = await (window as any).aptos.signAndSubmitTransaction(payload);
        await client.waitForTransaction(response.hash);
        handleFetchNfts(undefined, true); // Pass both parameters
    } catch (error) {
        console.error("Error ending auction:", error);
    }
}, [marketplaceAddr, handleFetchNfts]);


const handleOfferSubmit = async (amount: number, expiration: number): Promise<void> => {
  if (!selectedNft) return;

  console.log('MarketView - handleOfferSubmit:', {
    nftId: selectedNft?.id,
    amount,
    expiration,
    marketplaceAddr
  });
  
  try {
    const payload = {
      type: "entry_function_payload",
      function: `${marketplaceAddr}::NFTMarketplace::make_offer`,
      type_arguments: [],
      arguments: [marketplaceAddr, selectedNft.id.toString(), amount.toString(), expiration.toString()]
    };
    console.log('MarketView - Submitting transaction with payload:', payload);
    const response = await (window as any).aptos.signAndSubmitTransaction(payload);
    console.log('MarketView - Transaction response:', response);
    if (response) {
      setIsOfferModalVisible(false);
      await handleFetchNfts(rarity === 'all' ? undefined : rarity);
    }
  } catch (error) {
    console.error("Error submitting offer:", error);
  }
};

type DateRangeKey = '24h' | '7d' | '30d' | 'all';

const handleDateRangeChange = (value: DateRangeKey) => {
  const now = Date.now();
  const ranges = {
    '24h': [now - 86400000, now],
    '7d': [now - 604800000, now],
    '30d': [now - 2592000000, now],
    'all': [0, now]
  } as const;
  
  setDateRange(ranges[value] as [number, number]);
};

useEffect(() => {
  handleFetchNfts(undefined);
}, [handleFetchNfts]);

useEffect(() => {
  const interval = setInterval(() => {
    handleFetchNfts(undefined);
  }, 5000);
  return () => clearInterval(interval);
}, [handleFetchNfts]);

useEffect(() => {
  const checkAndEndExpiredAuctions = async () => {
    const currentTime = Math.floor(Date.now() / 1000);
    for (const nft of nfts) {
      if (nft.is_auction && nft.auction_end < currentTime) {
        await handleEndAuction(nft.id); // Pass just the ID instead of the whole NFT object
      }
    }
  };

  const interval = setInterval(checkAndEndExpiredAuctions, 30000);
  return () => clearInterval(interval);
}, [nfts, handleEndAuction]);

useEffect(() => {
  handleFetchNfts(rarity === 'all' ? undefined : rarity, false);
}, [
  marketplaceAddr,
  rarity,
  priceRange,
  filterStatus,
  sortBy,
  searchQuery
]);


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

      {/* Advanced Filters Panel */}
      <Button 
        onClick={() => setShowFilters(!showFilters)} 
        style={{ marginBottom: 16 }}
      >
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </Button>

      {showFilters && (
        <div style={{ marginBottom: 20, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}>
          <Row gutter={[16, 16]}>
            <Col span={24} md={8}>
              <Typography.Text strong>Price Range</Typography.Text>
              <Slider
                range
                value={priceRange}
                onChange={(value: number[]) => setPriceRange(value as [number, number])}
                min={0}
                max={5}
                step={0.1}
                marks={{
                  0: '0 APT',
                  5: '5 APT'
                }}
              />
            </Col>
            
            <Col span={24} md={8}>
              <Typography.Text strong>Date Listed</Typography.Text>
              <Select
                style={{ width: '100%' }}
                onChange={(value: DateRangeKey) => handleDateRangeChange(value)}
              >
                <Select.Option value="24h">Last 24 hours</Select.Option>
                <Select.Option value="7d">Last 7 days</Select.Option>
                <Select.Option value="30d">Last 30 days</Select.Option>
                <Select.Option value="all">All time</Select.Option>
              </Select>
            </Col>

            <Col span={24} md={8}>
              <Typography.Text strong>Status</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={filterStatus}
                onChange={setFilterStatus}
              >
                <Select.Option value="all">All Items</Select.Option>
                <Select.Option value="auction">Active Auctions</Select.Option>
                <Select.Option value="buyNow">Buy Now Only</Select.Option>
              </Select>
            </Col>

            <Col span={24} md={8}>
              <Typography.Text strong>Sort By</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={sortBy}
                onChange={setSortBy}
              >
                <Select.Option value="newest">Newest First</Select.Option>
                <Select.Option value="oldest">Oldest First</Select.Option>
                <Select.Option value="priceLow">Price: Low to High</Select.Option>
                <Select.Option value="priceHigh">Price: High to Low</Select.Option>
              </Select>
            </Col>

            <Col span={24} md={8}>
              <Typography.Text strong>Search</Typography.Text>
              <Input
                placeholder="Search by name or ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
              />
            </Col>

            <Col span={24}>
            <Button onClick={() => {
              setPriceRange([0, 5]);
              setDateRange([0, Date.now()]);
              setSearchQuery("");
              setSortBy("newest");
              setFilterStatus("all");
              setRarity('all');
              handleFetchNfts(undefined);
            }}>
              Clear All Filters
            </Button>

            </Col>
          </Row>
        </div>
      )}

  
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
          <NFTCard
            nft={nft}
            onBuyClick={handleBuyClick}
            onBidClick={handleBidClick}
            onOfferClick={(nft) => {
              setSelectedNft(nft);
              setIsOfferModalVisible(true);
            }}
          />
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

      <Modal
        title="Make Offer"
        visible={isOfferModalVisible}
        onCancel={() => setIsOfferModalVisible(false)}
        footer={null}
      >
        {selectedNft && (
          <OfferSystem
            nftId={selectedNft.id}
            currentPrice={selectedNft.price}
            onOfferSubmit={handleOfferSubmit}
          />
        )}
      </Modal>

    </div>
  );
};

export default MarketView;