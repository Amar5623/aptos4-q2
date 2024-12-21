import React, { useState } from 'react';
import { Modal, Input, Button, Switch, message as antMessage } from 'antd';
import { NFT } from '../types/NFT';

interface TransferModalProps {
  visible: boolean;
  nft: NFT | null;
  onCancel: () => void;
  onTransfer: (toAddress: string, message: string, isGift: boolean) => Promise<void>;
}

const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  nft,
  onCancel,
  onTransfer,
}) => {
  const [toAddress, setToAddress] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [isGift, setIsGift] = useState(false);

  const handleTransfer = async () => {
    if (!toAddress) {
      antMessage.error('Please enter recipient address');
      return;
    }

    try {
      await onTransfer(toAddress, transferMessage, isGift);
      setToAddress('');
      setTransferMessage('');
      setIsGift(false);
    } catch (error) {
      console.error('Transfer error:', error);
      antMessage.error('Failed to transfer NFT');
    }
  };

  return (
    <Modal
      title="Transfer NFT"
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="transfer" type="primary" onClick={handleTransfer}>
          Transfer
        </Button>,
      ]}
    >
      {nft && (
        <>
          <div style={{ marginBottom: 16 }}>
            <p><strong>NFT Name:</strong> {nft.name}</p>
            <p><strong>ID:</strong> {nft.id}</p>
          </div>
          <Input
            placeholder="Recipient Address"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <div style={{ marginBottom: 16 }}>
            <Switch
              checked={isGift}
              onChange={setIsGift}
              style={{ marginRight: 8 }}
            />
            <span>Send as Gift</span>
          </div>
          {isGift && (
            <Input.TextArea
            placeholder="Gift Message (optional)"
            value={transferMessage}
            onChange={(e) => setTransferMessage(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          )}
        </>
      )}
    </Modal>
  );
};

export default TransferModal;
