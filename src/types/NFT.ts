export interface NFT {
    id: number;
    name: string;
    description: string;
    uri: string;
    rarity: number;
    price: number;
    for_sale: boolean;
    owner: string;
}
