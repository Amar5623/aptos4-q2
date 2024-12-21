import React, { useEffect, useState, useCallback } from "react";
import { Typography, Card, Row, Col, Pagination, message as antMessage, Button, Input, Modal } from "antd";
import { AptosClient, Types } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import TransferModal from '../components/TransferModal';
import { GiftOutlined } from '@ant-design/icons';
import { OfferSystem } from '../components/OfferSystem';
import { OffersList } from '../components/OffersList';


function isHexString(value: any): value is string {
  return typeof value === 'string' && value.startsWith('0x');
}


const { Title } = Typography;
const { Meta } = Card;

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

interface NFT {
  id: number;
  name: string;
  description: string;
  uri: string;
  rarity: number;
  price: number;
  for_sale: boolean;
  owner: string;
}

interface GiftDetail {
  isGift: boolean;
  message: string;
  from: string;
  timestamp: number;
}

interface GiftDetails {
  [key: string]: GiftDetail;
}

interface NFTOffers {
  [key: number]: any[];
}

const hexToUint8Array = (hexString: string): Uint8Array => {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return bytes;
};


const MyNFTs: React.FC = () => {
  const pageSize = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [nftOffers, setNFTOffers] = useState<NFTOffers>({});
  const [totalNFTs, setTotalNFTs] = useState(0);
  const { account, signAndSubmitTransaction } = useWallet();
  const marketplaceAddr = "0xa256fddba13780914e70b6f74cf24af7548e796ad8dcbf331c85c93327f99ec4";
  

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [salePrice, setSalePrice] = useState<string>("");

  const [isAuctionModalVisible, setIsAuctionModalVisible] = useState(false);
  const [auctionDuration, setAuctionDuration] = useState("3600");
  const [startingBid, setStartingBid] = useState("");

  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [selectedNFTForTransfer, setSelectedNFTForTransfer] = useState<NFT | null>(null);

  const [giftDetails, setGiftDetails] = useState<GiftDetails>({});

  const [offers, setOffers] = useState([]);
  const [selectedNFTForOffer, setSelectedNFTForOffer] = useState<NFT | null>(null);

  const fetchUserNFTs = useCallback(async () => {
    if (!account) return;

    try {
      console.log("Fetching NFT IDs for owner:", account.address);

      const nftIdsResponse = await client.view({
        function: `${marketplaceAddr}::NFTMarketplace::get_all_nfts_for_owner`,
        arguments: [marketplaceAddr, account.address, "100", "0"],
        type_arguments: [],
      });

      const nftIds = Array.isArray(nftIdsResponse[0]) ? nftIdsResponse[0] : nftIdsResponse;
      setTotalNFTs(nftIds.length);

      if (nftIds.length === 0) {
        console.log("No NFTs found for the owner.");
        setNfts([]);
        return;
      }

      console.log("Fetching details for each NFT ID:", nftIds);

      const userNFTs = (await Promise.all(
        nftIds.map(async (id) => {
          try {
            const nftDetails = await client.view({
              function: `${marketplaceAddr}::NFTMarketplace::get_nft_details`,
              arguments: [marketplaceAddr, id],
              type_arguments: [],
            });

            const [nftId, owner, name, description, uri, price, forSale, rarity] = nftDetails as [
              number,
              string,
              string,
              string,
              string,
              number,
              boolean,
              number
            ];

            const hexToUint8Array = (hexString: string): Uint8Array => {
              const bytes = new Uint8Array(hexString.length / 2);
              for (let i = 0; i < hexString.length; i += 2) {
                bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
              }
              return bytes;
            };

            return {
              id: nftId,
              name: new TextDecoder().decode(hexToUint8Array(name.slice(2))),
              description: new TextDecoder().decode(hexToUint8Array(description.slice(2))),
              uri: new TextDecoder().decode(hexToUint8Array(uri.slice(2))),
              rarity,
              price: price / 100000000, // Convert octas to APT
              for_sale: forSale,
            };
          } catch (error) {
            console.error(`Error fetching details for NFT ID ${id}:`, error);
            return null;
          }
        })
      )).filter((nft): nft is NFT => nft !== null);

      console.log("User NFTs:", userNFTs);
      setNfts(userNFTs);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      antMessage.error("Failed to fetch your NFTs.");
    }
  }, [account, marketplaceAddr]);

  const acceptOffer = async (nftId: string, offerId: string) => {
    // Cast window.aptos to handle the transaction
    const payload = {
      type: "entry_function_payload",
      function: `${marketplaceAddr}::NFTMarketplace::accept_offer`,
      type_arguments: [],
      arguments: [nftId, offerId]
    };
    
    try {
      // Use the window.aptos object directly
      const response = await (window as any).aptos.signAndSubmitTransaction(payload);
      await client.waitForTransaction(response.hash);
      return response.hash;
    } catch (error) {
      console.error("Error accepting offer:", error);
      throw error;
    }
};



  const handleSellClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedNft(null);
    setSalePrice("");
  };

  const handleConfirmListing = async () => {
    if (!selectedNft || !salePrice) return;
  
    try {
      const priceInOctas = parseFloat(salePrice) * 100000000;
  
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::list_for_sale`,
        type_arguments: [],
        arguments: [marketplaceAddr, selectedNft.id.toString(), priceInOctas.toString()],
      };
  
      // Bypass type checking
      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);
  
      antMessage.success("NFT listed for sale successfully!");
      setIsModalVisible(false);
      setSalePrice("");
      fetchUserNFTs();
    } catch (error) {
      console.error("Error listing NFT for sale:", error);
      antMessage.error("Failed to list NFT for sale.");
    }
  };

  const handleCreateAuction = async () => {
    if (!selectedNft || !startingBid || !auctionDuration) return;

    try {
        const startingBidInOctas = Math.floor(parseFloat(startingBid) * 100000000).toString();
        
        const payload = {
            type: "entry_function_payload",
            function: `${marketplaceAddr}::NFTMarketplace::create_auction`,
            type_arguments: [],
            arguments: [
                marketplaceAddr,
                selectedNft.id.toString(),
                startingBidInOctas,  // Using your input starting bid
                auctionDuration,
                "10000000"  // 0.1 APT in Octas
            ],
        };

        const response = await (window as any).aptos.signAndSubmitTransaction(payload);
          await client.waitForTransaction(response.hash);
          antMessage.success("Auction created successfully!");
          setIsAuctionModalVisible(false);
          fetchUserNFTs();
      } catch (error) {
          console.error("Error creating auction:", error);
          antMessage.error("Failed to create auction.");
      }
  };

  const handleTransfer = async (toAddress: string, message: string, isGift: boolean) => {
    if (!selectedNFTForTransfer) return;
  
  
    try {
      const payload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::transfer_nft_with_message`,
        type_arguments: [],
        arguments: [
          marketplaceAddr,
          selectedNFTForTransfer.id.toString(),
          toAddress,
          Array.from(new TextEncoder().encode(message)),
          isGift
        ],
      };
  
      const response = await (window as any).aptos.signAndSubmitTransaction(payload);
        await client.waitForTransaction(response.hash);
        antMessage.success('NFT transferred successfully!');
        setIsTransferModalVisible(false);
        fetchUserNFTs();
      } catch (error) {
        console.error('Transfer error:', error);
        antMessage.error('Failed to transfer NFT');
      }
    };

    const fetchGiftDetails = async (nftId: number) => {
      try {
        const response = await client.view({
          function: `${marketplaceAddr}::NFTMarketplace::get_nft_gift_details`,
          arguments: [marketplaceAddr, nftId],
          type_arguments: [],
        });
        
        const [isGift, message, from, timestamp] = response;
        if (isGift && isHexString(message)) {
          setGiftDetails(prev => ({
            ...prev,
            [nftId]: {
              isGift,
              message: new TextDecoder().decode(hexToUint8Array(message.slice(2))),
              from,
              timestamp
            }
          }));
        }
      } catch (error) {
        console.error('Error fetching gift details:', error);
      }
    };

    const handleOfferSubmit = async (nftId: number, amount: number, expiration: number) => {
      try {
        const payload = {
          type: "entry_function_payload",
          function: `${marketplaceAddr}::NFTMarketplace::make_offer`,
          type_arguments: [],
          arguments: [
            nftId.toString(),
            Math.floor(amount * 100000000),
            Math.floor(Date.now() / 1000) + expiration
          ],
          data: {} // Add this to match InputTransactionData type
        };
        
        const response = await (window as any).aptos.signAndSubmitTransaction(payload);
        await client.waitForTransaction(response.hash);
        fetchOffersForNFT(nftId);
      } catch (error) {
        console.error("Error submitting offer:", error);
        antMessage.error("Failed to submit offer");
      }
    };
    
    const fetchOffersForNFT = async (nftId: number) => {
      try {
        const offers = await client.view({
          function: `${marketplaceAddr}::NFTMarketplace::get_offers_for_nft`,
          type_arguments: [],
          arguments: [nftId.toString()]
        });
        setNFTOffers((prev: { [key: number]: any[] }) => ({
          ...prev,
          [nftId]: offers
        }));
      } catch (error) {
        console.error("Error fetching offers:", error);
      }
    };
    
    
    const handleAcceptOffer = async (nftId: number, offerId: string) => {
      try {
        const payload: Types.TransactionPayload = {
          type: "entry_function_payload",
          function: `${marketplaceAddr}::NFTMarketplace::accept_offer`,
          type_arguments: [],
          arguments: [nftId.toString(), offerId]
        };
        
        const response = await (window as any).aptos.signAndSubmitTransaction(payload);
        await client.waitForTransaction(response.hash);
        fetchOffersForNFT(nftId);
        fetchUserNFTs();
      } catch (error) {
        console.error("Error accepting offer:", error);
        antMessage.error("Failed to accept offer");
      }
    };


  useEffect(() => {
    fetchUserNFTs();
  }, [fetchUserNFTs, currentPage]);

  useEffect(() => {
    const loadGiftDetails = async () => {
      for (const nft of nfts) {
        await fetchGiftDetails(nft.id);
      }
    };
    
    if (nfts.length > 0) {
      loadGiftDetails();
    }
  }, [nfts]);

  useEffect(() => {
    if (nfts.length > 0) {
      nfts.forEach(nft => fetchOffersForNFT(nft.id));
    }
  }, [nfts]);

  const paginatedNFTs = nfts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div
      style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Title level={2} style={{ marginBottom: "20px" }}>My Collection</Title>
      <p>Your personal collection of NFTs.</p>
  
      {/* Card Grid */}
      <Row
        gutter={[24, 24]}
        style={{
          marginTop: 20,
          width: "100%",
          maxWidth: "100%",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {paginatedNFTs.map((nft) => (
          <Col
            key={nft.id}
            xs={24} sm={12} md={8} lg={8} xl={6}
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Card
              hoverable
              style={{
                width: "100%",
                maxWidth: "280px", // Increase max width to improve spacing
                minWidth: "220px",  // Increase minimum width to prevent stacking
                margin: "0 auto",
              }}
              cover={<img alt={nft.name} src={nft.uri} />}
              extra={giftDetails[nft.id]?.isGift && (
                <GiftOutlined 
                  style={{ color: '#ff4d4f', fontSize: '24px' }}
                  onClick={() => {
                    Modal.info({
                      title: 'Gift Message',
                      content: (
                        <div>
                          <p>{giftDetails[nft.id].message}</p>
                          <p>From: {giftDetails[nft.id].from}</p>
                          <p>Received: {new Date(giftDetails[nft.id].timestamp * 1000).toLocaleString()}</p>
                        </div>
                      ),
                    });
                  }}
                />
              )}
              actions={[
                <Button type="link" onClick={() => handleSellClick(nft)}>Sell</Button>,
                <Button type="link" onClick={() => {
                  setSelectedNft(nft);
                  setIsAuctionModalVisible(true);
                }}>Create Auction</Button>,
                <Button 
                  type="link" 
                  onClick={() => {
                    setSelectedNFTForTransfer(nft);
                    setIsTransferModalVisible(true);
                  }}
                >
                  Transfer
                </Button>
              ]}
            >
              <Meta title={nft.name} description={`Rarity: ${nft.rarity}, Price: ${nft.price} APT`} />
              <p>ID: {nft.id}</p>
              <p>{nft.description}</p>
              <p style={{ margin: "10px 0" }}>For Sale: {nft.for_sale ? "Yes" : "No"}</p>
  
              <OfferSystem 
                nftId={nft.id}
                currentPrice={nft.price}
                onOfferSubmit={(amount, expiration) => handleOfferSubmit(nft.id, amount, expiration)}
              />
              <OffersList 
                offers={nftOffers[nft.id] || []}
                onAcceptOffer={(offerId) => handleAcceptOffer(nft.id, offerId)}
              />


            </Card>
          </Col>
        ))}
      </Row>
  
      <div style={{ marginTop: 30, marginBottom: 30 }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={totalNFTs}
          onChange={(page) => setCurrentPage(page)}
          style={{ display: "flex", justifyContent: "center" }}
        />
      </div>
  
      <Modal
        title="Sell NFT"
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmListing}>
            Confirm Listing
          </Button>,
        ]}
      >
        {selectedNft && (
          <>
            <p><strong>NFT ID:</strong> {selectedNft.id}</p>
            <p><strong>Name:</strong> {selectedNft.name}</p>
            <p><strong>Description:</strong> {selectedNft.description}</p>
            <p><strong>Rarity:</strong> {selectedNft.rarity}</p>
            <p><strong>Current Price:</strong> {selectedNft.price} APT</p>
  
            <Input
              type="number"
              placeholder="Enter sale price in APT"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              style={{ marginTop: 10 }}
            />
          </>
        )}
      </Modal>

      <Modal
        title="Create Auction"
        visible={isAuctionModalVisible}
        onCancel={() => setIsAuctionModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsAuctionModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleCreateAuction}>
            Create Auction
          </Button>
        ]}
      >
        <Input
          type="number"
          placeholder="Starting bid in APT"
          value={startingBid}
          onChange={(e) => setStartingBid(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <Input
          type="number"
          placeholder="Duration in seconds"
          value={auctionDuration}
          onChange={(e) => setAuctionDuration(e.target.value)}
        />
      </Modal>

      <TransferModal
            visible={isTransferModalVisible}
            nft={selectedNFTForTransfer}
            onCancel={() => {
                setIsTransferModalVisible(false);
                setSelectedNFTForTransfer(null);
            }}
            onTransfer={handleTransfer}
        />
    </div>
  );  
};

export default MyNFTs;